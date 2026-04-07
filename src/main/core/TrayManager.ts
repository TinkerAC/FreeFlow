import { app, Menu, Tray } from 'electron';
import { inject } from 'inversify';
import { DISymbol } from '@main/di/symbol';
import { WindowKey, WindowManager } from '@main/window/windowManager';
import { OS } from '@src/shared/OS';
import { resolveAppIconPath } from '@main/core/PathConfig';

/**
 * TrayManager
 * -----------
 * 单例托盘管理器：负责创建、维护及销毁系统托盘图标。
 */
export default class TrayManager {
  private tray: Tray | null = null;

  constructor(
    @inject(DISymbol.RunningOS) private os: OS,
    @inject(DISymbol.WindowManager) private windowManager: WindowManager,
    @inject(DISymbol.Logger) private logger: import('winston').Logger,
  ) {}

  public createTray(): Tray {
    switch (this.os) {
      case OS.WINDOWS: {
        const tray = this.createWindowsTray();
        this.logger.info('系统托盘已创建');
        return tray;
      }
      default: {
        this.logger.info(`当前操作系统 ${this.os} 不支持托盘功能`);
      }
    }
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

  /** 创建或返回已存在的托盘实例 */
  private createWindowsTray(): Tray {
    if (this.tray) return this.tray; // 保证单例

    const trayIconPath = resolveAppIconPath('appIcon_default.png');
    this.tray = new Tray(trayIconPath);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => this.windowManager.show(WindowKey.MAIN),
      },
      {
        label: '退出',
        click: () => app.quit(),
      },
    ]);

    this.tray.setToolTip('FreeFlow');
    this.tray.setContextMenu(contextMenu);

    this.tray.on('click', () => this.windowManager.show(WindowKey.MAIN));

    console.log('系统托盘已创建');
    return this.tray;
  }
}
