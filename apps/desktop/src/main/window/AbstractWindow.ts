import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import path from 'path';

/**
 * 通用窗口基类：
 *  - 合并默认 & 自定义 BrowserWindow 配置
 *  - 提供 showWhenReady / safeLoadURL 等辅助方法
 *  - 统一资源释放
 */
export abstract class AbstractWindow extends BrowserWindow {
  protected constructor(opts: BrowserWindowConstructorOptions) {
    super({ ...AbstractWindow.getDefaultOptions(), ...opts });

    // 窗口准备好后显示（避免白屏闪烁）
    this.once('ready-to-show', () => this.show());

    // 最大化时取消窗口阴影（可选）
    this.on('maximize', () => this.setHasShadow(false));
    this.on('unmaximize', () => this.setHasShadow(true));

    // 所有窗口共通：失去引用时自动销毁
    this.on('closed', () => {
      // macOS 下保留 core 激活逻辑，Windows/Linux 直接回收
      if (process.platform !== 'darwin') this.destroy();
    });
  }

  /** 子类可通过 super.getDefaultOptions() 自行拓展 */
  protected static getDefaultOptions(): BrowserWindowConstructorOptions {
    return {
      width: 800,
      height: 600,
      minWidth: 800,
      minHeight: 600,
      backgroundColor: '#202020',
      show: false,
      autoHideMenuBar: true,
      icon: path.resolve('assets/images/appIcon.ico'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: true,
      },
    };
  }

  /** 切换显隐 */
  toggle(): void {
    this.isVisible() ? this.hide() : this.show();
  }

  /** 聚焦到此窗口（若被最小化则恢复） */
  refocus(): void {
    if (this.isMinimized()) this.restore();
    this.focus();
  }

  /** 包装 loadURL，输出错误堆栈 */
  protected async safeLoadURL(url: string): Promise<void> {
    try {
      await this.loadURL(url);
    } catch (e) /* eslint-disable-next-line no-console */ {
      console.error(`[Window] failed to load URL ${url}`, e);
    }
  }

  /** 包装 loadFile，输出错误堆栈 */
  protected async safeLoadFile(filePath: string): Promise<void> {
    try {
      await this.loadFile(filePath);
    } catch (e) /* eslint-disable-next-line no-console */ {
      console.error(`[Window] failed to load file ${filePath}`, e);
    }
  }

  /** 开发环境自动打开 devtools */
  protected openDevtoolsIfDev(): void {
    if (process.env.NODE_ENV === 'development') this.webContents.openDevTools();
  }
}
