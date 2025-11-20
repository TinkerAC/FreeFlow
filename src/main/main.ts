// file: src/main/core/core.ts
import { app } from 'electron';
import { WindowKey, WindowManager } from './window/windowManager';
import { markQuitting } from './window/quitState';

import ProxyServerManager from '@main/core/AudioProxyServer';
import { ConfigService } from '@main/core/configService';
import LocalLibraryService from '@main/services/localLibraryService';
import { sequelize } from '@main/database/seqimpl';
import { is_hifini_cookies_expired } from '@main/services/AuthService';
import { container } from '@main/di/di-container';
import { DISymbol } from '@main/di/symbol';
import IpcController from '@main/core/ipc/IpcController';
import TrayManager from '@main/core/TrayManager';
import ShortCutManager from '@main/core/ShortCutManager';
import { getOperatingSystem } from '@src/utils/helpers';
import chalk from 'chalk';
import { OS } from '@src/shared/OS';
import { Channels } from '@src/shared/ipc/channels';
import rootLogger from '@src/utils/logger';
import { setAppMenu } from '@main/core/menu/Menu';
import { Session } from '@main/database/seqimpl/Session';

const logger = rootLogger.child(
  { context: 'Main' },
);


// 全局异常兜底
process.on('uncaughtException', (e) => console.error('[main] UncaughtException:', e));
process.on('unhandledRejection', (e) => console.error('[main] UnhandledRejection:', e));

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  logger.info('App started');
  const windowManager = container.get<WindowManager>(DISymbol.WindowManager);

  // 若用户再次启动应用，将唤起已有主窗口
  app.on('second-instance', () => {
    if (windowManager.isVisible(WindowKey.MINI)) {
      windowManager.activate(WindowKey.MINI);
    } else {
      windowManager.activate(WindowKey.MAIN);
    }
  });

  // 依赖注入获取服务实例
  const localLibraryService = container.get<LocalLibraryService>(DISymbol.LocalLibraryService);
  const configService: ConfigService = container.get<ConfigService>(DISymbol.ConfigService);
  const proxyServerManager = container.get<ProxyServerManager>(DISymbol.ProxyServerManager);
  const ipcController = container.get<IpcController>(DISymbol.IpcController);
  const trayManager = container.get<TrayManager>(DISymbol.TrayManager);
  const shortcutManager = container.get<ShortCutManager>(DISymbol.ShortcutManager);
  const os: OS = container.get<OS>(DISymbol.RunningOS);

  // 稳定性：限制外部导航/弹窗
  app.on('web-contents-created', (_e, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
    contents.on('will-navigate', (ev, url) => {
      if (!url.startsWith('file://') && !url.startsWith('app://')) ev.preventDefault();
    });
  });

  // READY
  app.whenReady().then(async () => {

    // 1) 菜单
    setAppMenu();
    // 2) 初始化
    await sequelize.sync();
    await localLibraryService.updateLocalLibrary();
    await proxyServerManager.start();

    // 3) 创建窗口
    windowManager.activate(WindowKey.MAIN);

    // 4) 其余注册
    ipcController.register();
    windowManager.ensure(WindowKey.WORKER);

    // 检查 hifini Cookie 过期状态
    const cookies = (configService.get('services.hifiniCookie') as { [key: string]: string }) ?? {};
    console.log('cookies:', cookies);
    if (await is_hifini_cookies_expired(cookies)) {
      // mainWindow.webContents.send('notification', 'Hifini 登陆已过期，请重新登陆');
      return console.warn('Hifini 已经死了.');
    }

    // Windows 托盘
    trayManager.createTray();

    // 注册全局快捷键
    shortcutManager.register();

    // 记录启动信息
    const startAt = new Date();
    Session.create({
      start_at: startAt,
      operating_system: getOperatingSystem(),
      app_version: app.getVersion(),
    }).then(() => {
      console.info(
        chalk.green(
          `启动信息记录成功: ${startAt.toISOString()} ${getOperatingSystem()} ${app.getVersion()}`,
        ),
      );
    }).catch(error => {
      logger.error('记录启动信息失败', error);
    });
  });

  // Dock / 任务栏 被点击激活
  app.on('activate', () => {
    // 若 Mini 正在使用，点击 Dock 应该恢复 Mini 而不是主界面
    if (windowManager.isVisible(WindowKey.MINI)) {
      windowManager.activate(WindowKey.MINI);
      return;
    }
    windowManager.activate(WindowKey.MAIN);
  });

  // 所有窗口关闭：macOS 常驻，其它平台退出
  app.on('window-all-closed', () => {
    if (os !== OS.MACOS) app.quit();
  });

  // 触发退出
  app.on('before-quit', () => {
    markQuitting();
  });

  // 真正退出前：注销快捷键
  app.on('will-quit', () => {
    shortcutManager.unregister();
    windowManager.shutdown();
  });
}
