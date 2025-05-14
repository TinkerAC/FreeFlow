import { app, BrowserWindow, Menu, Tray } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * TrayManager
 * -----------
 * 单例托盘管理器：负责创建、维护及销毁系统托盘图标。
 */
export default class TrayManager {
  private tray: Tray | null = null;

  constructor(private readonly mainWindow: BrowserWindow) {
  }

  /** 创建或返回已存在的托盘实例 */
  public create(): Tray {
    if (this.tray) return this.tray; // 保证单例

    const trayIconPath = path.join(__dirname, '..', '..', 'assets', 'appIcon.ico');
    this.tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => this.mainWindow.show(),
      },
      {
        label: '退出',
        click: () => app.quit(),
      },
    ]);

    this.tray.setToolTip('FreeFlow');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => this.mainWindow.show());

    console.log('系统托盘已创建');
    return this.tray;
  }

  /** 释放托盘资源（可在退出或热重载时调用） */
  public destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  /** 获取当前 Tray 实例（可能为 null） */
  public getTray(): Tray | null {
    return this.tray;
  }
}

