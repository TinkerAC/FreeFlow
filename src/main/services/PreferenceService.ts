import { inject, injectable } from 'inversify';
import ElectronStore from 'electron-store';
import { app, nativeImage } from 'electron';

import appIconDefaultPng from '@assets/appIcons/appIcon_default.png';
import appIconJetBrainsPng from '@assets/appIcons/appIcon_jetbrains.png';
import appIconFancyPng from '@assets/appIcons/appIcon_fancy.png';
import path from 'path';
import { DiSymbol } from '@main/di/symbol';
import { AppIcon } from '@src/shared/hifiniCookies';
import NativeImage = Electron.NativeImage;


//存储图标的映射关系
const AppIconMap: Map<AppIcon, string> = new Map([
  [AppIcon.Default, appIconDefaultPng],
  [AppIcon.JetBrains, appIconJetBrainsPng],
  [AppIcon.Fancy, appIconFancyPng],

]);

@injectable()
export class PreferenceService {
  private readonly KEY_APP_ICON = 'appIcon';

  constructor(
    @inject(DiSymbol.Store) private store: ElectronStore,
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

  /** Return frontend preview URL for icon */
  public getPreview(icon: AppIcon): string | undefined {
    return AppIconMap.get(icon);
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
    const file = `appIcon_${icon}.${ext}`;

    // production (in .core bundle or win/linux resources)
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'assets', 'appIcons', file);
    }

    // development ─ using electron-forge + plugin-webpack:
    // main bundle lives in <root>/.webpack/main, so __dirname === …/.webpack/main
    // go two levels up to repo root, then assets/…
    return path.join(__dirname, '..', '..', 'assets', 'appIcons', file);
  }

  /** macOS only: update the Dock icon immediately */
  private updateDockIcon(icon: AppIcon) {
    if (process.platform !== 'darwin') return;
    const icnsPath: string = this.resolveIconFile(icon, 'icns');
    const pngPath: string = this.resolveIconFile(icon, 'png');
    let using = 'icns';
    let img: NativeImage = nativeImage.createFromPath(icnsPath);
    if (img.isEmpty()) {
      img = nativeImage.createFromPath(pngPath);
      using = 'png';
    }
    console.log('[PreferenceService] trying icon', icnsPath, '→', !img.isEmpty());

    if (!img.isEmpty()) {
      console.log(`[PreferenceService] 设置图标 ${icnsPath} (${using})`);
      //裁剪图标适配dock

      img = img.resize({
        width: 128,
        height: 128,
      });

      app.dock.setIcon(img);
    } else {
      console.warn(`图标 ${icnsPath} 加载失败，使用默认图标`);    // 如果加载失败，使用默认图标
    }
  }

  // 已由 resolveIconFile 统一处理，保留一个兼容别名
  private resolveIcns(icon: AppIcon): string {
    return this.resolveIconFile(icon, 'icns');
  }
}