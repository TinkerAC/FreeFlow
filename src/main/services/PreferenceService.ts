import { inject, injectable } from 'inversify';
import ElectronStore from 'electron-store';
import { app, nativeImage } from 'electron';

import path from 'path';
import { DiSymbol } from '@main/di/symbol';
import { AppIcon } from '@src/shared/hifiniCookies';
import sharp from 'sharp';


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
      ? path.join(process.resourcesPath, 'assets', 'appIcons')
      : path.join(__dirname, '..', '..', 'assets', 'appIcons');

    // icns 文件直接放在根目录下
    if (ext === 'icns') {
      return path.join(baseDir, `appIcon_${icon}.icns`);
    }

    // png 时，打开对应的 .iconset 文件夹，读取 icon_512x512@2x.png
    const iconsetDir = `${icon}.iconset`;
    const pngFileName = 'icon_512x512@2x.png';

    return path.join(baseDir, iconsetDir, pngFileName);
  }

  /** macOS only: update the Dock icon immediately */


  private async updateDockIcon(icon: AppIcon) {
    if (process.platform !== 'darwin') return;

    const icnsPath = this.resolveIconFile(icon, 'icns');
    const pngPath = this.resolveIconFile(icon, 'png');

    // 先按原来逻辑加载
    let img = nativeImage.createFromPath(icnsPath);
    if (img.isEmpty()) {
      img = nativeImage.createFromPath(pngPath);
    }
    if (img.isEmpty()) {
      console.warn(`图标都加载失败，跳过圆角处理`);
      return;
    }

    app.dock.setIcon(img);
  }


  private async createDockIcon(srcPngPath: string): Promise<Electron.NativeImage> {
    // 1. 读取并缩放源图到 128×128
    const baseBuf = await sharp(srcPngPath)
      .resize(128, 128)
      .png()
      .toBuffer();

    // 2. 内联 SVG squircle / 圆角矩形蒙版（rx / ry 控制圆角半径）
    const maskSvg = `
    <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
      <!-- 连续曲率 squircle 用贝塞尔近似；如嫌复杂亦可改成 rx="20" 的 rect -->
      <path d="
        M64 0
        C99 0 128 29 128 64
        S99 128 64 128
        0 99 0 64
        29 0 64 0Z" fill="white"/>
        
    </svg>
  `;

    const maskBuf = await sharp(Buffer.from(maskSvg))
      .resize(128, 128) // 确保尺寸匹配
      .png()
      .toBuffer();

    // 3. 组合蒙版 + 15% 阴影
    // const outBuf = await sharp(baseBuf)
    //   // 3-1 透明蒙版；非 squircle 区域全部清空
    //   .composite([{ input: maskBuf, blend: 'dest-in' }])
    //   // 3-2 统一 Dock 阴影（可按需调节透明度 / 模糊）
    //   .composite([{
    //     input: Buffer.from(`
    //     <svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
    //       <rect x="0" y="0" width="128" height="128"
    //             fill="black" opacity="0.15" rx="64" ry="64"/>
    //     </svg>`),
    //     blend: 'over',
    //   }])
    //   .png()
    //   .toBuffer();

    const outBuf = await sharp(baseBuf).composite([{ input: maskBuf, blend: 'dest-in' }]).png().toBuffer();


    // 4. 应用到 Dock
    const ni = nativeImage.createFromBuffer(outBuf);
    app.dock.setIcon(ni);
    return ni;
  }


}