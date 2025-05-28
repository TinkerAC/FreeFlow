import { inject, injectable } from 'inversify';
import ElectronStore from 'electron-store';
import { app, BrowserWindow, nativeImage } from 'electron';

import path from 'path';
import { DISymbol } from '@main/di/symbol';
import { AppIcon } from '@src/shared/hifiniCookies';
import fs from 'fs';

@injectable()
export class PreferenceService {
  private readonly KEY_APP_ICON = 'appIcon';

  constructor(
    @inject(DISymbol.Store) private store: ElectronStore,
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
    return (this.store.get(this.KEY_APP_ICON) as AppIcon) ?? AppIcon.Default;
  }

  /** Set and persist a new Dock/core icon */
  public async setAppIcon(icon: AppIcon): Promise<void> {
    this.updateDockIcon(icon);
    this.store.set(this.KEY_APP_ICON, icon);
  }


  /** Apply saved icon on core startup */
  private applySavedDockIcon() {
    this.updateDockIcon(this.getCurrentIcon());
  }

  /**
   * 组合图标文件物理路径
   * - 打包后：<resources>/assets/appIcons/appIcon_*.{icns|png}
   * - 开发时：<repo_root>/assets/appIcons/appIcon_*.{icns|png}
   */
  private resolveIconFile(icon: AppIcon, ext: 'icns' | 'png'): string {
    // 通用变量
    const baseDir = app.isPackaged
      ? path.join(process.resourcesPath, 'appIcons')
      : path.join(__dirname, '..', '..', 'assets', 'appIcons');


    // png 时，打开对应的 文件夹，读取 icon_512x512@2x.png
    const iconsetDir = `${icon}`;
    // icns 文件直接放在根目录下
    if (ext === 'icns') {
      return path.join(baseDir, `${icon}`, `icon.icns`);
    }

    const pngFileName = 'icon_512x512@2x.png';

    return path.join(baseDir, iconsetDir, pngFileName);
  }

  /** macOS only: update the Dock icon immediately */


  private async updateDockIcon(icon: AppIcon) {
    if (process.platform !== 'darwin') return;

    const pngPath = this.resolveIconFile(icon, 'png');
    console.log('从路径加载图标：', pngPath);
    // 先按原来逻辑加载
    const img = nativeImage.createFromPath(pngPath);

    if (img.isEmpty()) {
      console.warn(`图标都加载失败，跳过圆角处理`);
      return;
    }
    app.dock.setIcon(img);
    this.overwriteAppIcon(icon);
  }


  private overwriteAppIcon(icon: AppIcon): void {
    const srcIcns = this.resolveIconFile(icon, 'icns');
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


}