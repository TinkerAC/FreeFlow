import { inject, injectable } from 'inversify';
import { app, BrowserWindow, nativeImage } from 'electron';

import path from 'path';
import { DISymbol } from '@main/di/symbol';
import { AppIcon } from '@src/shared/hifiniCookies';
import fs from 'fs';
import { spawn } from 'node:child_process';
import { ConfigService } from '@main/core/configService';

@injectable()
export class PreferenceService {
  constructor(
    @inject(DISymbol.ConfigService) private configService: ConfigService,
  ) {
    // Apply saved icon on startup
    if (app.isReady()) {
      this.applySavedDockIcon();
    } else {
      app.whenReady().then(() => this.applySavedDockIcon());
    }
  }

  /** Get current selected icon (default if none) */
  public getCurrentIcon(): AppIcon {
    return (this.configService.get('app.icon') as AppIcon) ?? AppIcon.Default;
  }

  /** Set and persist a new Dock/core icon */
  public async setAppIcon(icon: AppIcon): Promise<void> {
    // 仅写入设置；由订阅者/构造器负责应用，避免循环
    this.configService.setByPath('app.icon', icon);
  }

  /** 仅应用图标（不写入配置，避免循环） */
  public async applyIcon(icon: AppIcon): Promise<void> {
    this.updateAppIcon(icon);
  }


  /** Apply saved icon on core startup */
  private applySavedDockIcon() {
    this.updateAppIcon(this.getCurrentIcon());
  }

  /** 返回打包/开发时的 appIcons 目录 */
  private getAppIconsBaseDir(): string {
    return app.isPackaged
      ? path.join(process.resourcesPath, 'appIcons')
      : path.join(__dirname, '..', '..', 'assets', 'appIcons');
  }

  /**
   * 组合图标文件路径（按平台选择合适格式）
   * - macOS: .icns + 备用 png
   * - win32: .ico + 备用 png
   * - linux: .png
   */
  private resolveIconFile(icon: AppIcon): { primary: string; fallbackPng: string } {
    const baseDir = this.getAppIconsBaseDir();
    const dir = path.join(baseDir, `${icon}`);
    const png = path.join(dir, 'icon_512x512@2x.png');
    if (process.platform === 'darwin') {
      return { primary: path.join(dir, 'icon.icns'), fallbackPng: png };
    }
    if (process.platform === 'win32') {
      return { primary: path.join(dir, 'icon.ico'), fallbackPng: png };
    }
    return { primary: png, fallbackPng: png };
  }

  /**
   * 应用图标到当前运行会话（各平台）：
   * - macOS: 优先调用外部 Swift 小工具；否则回退到覆盖 electron.icns + setDockIcon。
   * - Windows: 更新所有窗口的图标（.ico 优先，退化到 png）。
   * - Linux: 更新所有窗口的图标（png）。
   */
  private async updateAppIcon(icon: AppIcon) {
    const { primary, fallbackPng } = this.resolveIconFile(icon);
    if (process.platform === 'darwin') {
      const tool = this.findMacSetIconTool();
      if (tool) {
        try {
          await this.runMacSetIconTool(tool, primary);
          // 同步 Dock 以立刻可见
          const img = nativeImage.createFromPath(fallbackPng);
          if (!img.isEmpty()) app.dock.setIcon(img);
          this.refreshAllWindowIcons(img);
          return;
        } catch (e) {
          console.warn('[ICON] 调用 Swift 工具失败，回退到覆盖 electron.icns：', e);
        }
      }
      // 回退：覆盖主 icns 并刷新 Dock
      this.overwriteAppIconWithIcns(primary);
      const img = nativeImage.createFromPath(fallbackPng);
      if (!img.isEmpty()) app.dock.setIcon(img);
      this.refreshAllWindowIcons(img);
      return;
    }

    // Windows / Linux: 设置所有窗口图标
    let img = nativeImage.createFromPath(primary);
    if (img.isEmpty()) img = nativeImage.createFromPath(fallbackPng);
    if (img.isEmpty()) {
      console.error('[ICON] 无法加载图标：', primary, 'fallback:', fallbackPng);
      return;
    }
    this.refreshAllWindowIcons(img);
  }


  private overwriteAppIconWithIcns(srcIcns: string): void {
    console.log('[ICON] 源 icns 路径:', srcIcns);

    if (!fs.existsSync(srcIcns)) {
      console.error('[ICON] icns 文件不存在，无法覆盖');
      return;
    }

    // 2. 主图标文件路径（不带扩展名的 CFBundleIconFile = appIcon_default）
    const destIcns = path.join(
      process.resourcesPath,
      'electron.icns',
    );

    try {
      // 3. 同步复制覆盖并重命名为 electron.icns
      fs.copyFileSync(srcIcns, destIcns);


      console.log('[ICON] 已覆盖主 icns:', destIcns);

      // 4. 运行时立即更新 Dock 图标
      const dockImg = nativeImage.createFromPath(destIcns);
      if (!dockImg.isEmpty() && process.platform === 'darwin') {
        app.dock.setIcon(dockImg);
      }

      // 5. 更新所有已打开窗口的图标（Linux/Windows 也可以用这句）
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(win => win.setIcon(dockImg));
    } catch (e) {
      console.error('[ICON] 覆盖或刷新图标时出错：', e);
    }
  }

  private refreshAllWindowIcons(img: Electron.NativeImage) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => win.setIcon(img));
  }

  /**
   * macOS: 查找外部 Swift 小工具的路径，支持：
   * - 环境变量 FREEFLOW_SETICON_TOOL
   * - resources/bin/setAppIcon
   * - resources/macTools/SetAppIcon
   */
  private findMacSetIconTool(): string | null {
    if (process.platform !== 'darwin') return null;
    const candidates = [
      process.env.FREEFLOW_SETICON_TOOL,
      path.join(process.resourcesPath, 'bin', 'setAppIcon'),
      path.join(process.resourcesPath, 'macTools', 'SetAppIcon'),
    ].filter(Boolean) as string[];
    for (const p of candidates) {
      try { if (p && fs.existsSync(p)) return p; } catch { /* ignore */ }
    }
    return null;
  }

  /** 调用外部 Swift 小工具设置 App 图标 */
  private runMacSetIconTool(toolPath: string, icnsPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(toolPath, [icnsPath], { stdio: 'inherit' });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code === 0) resolve(); else reject(new Error(`exit ${code}`));
      });
    });
  }


}
