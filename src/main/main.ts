// file: src/main/core/core.ts
import { app } from 'electron';
import { WindowKey, WindowManager } from './window/windowManager';

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
import { SessionDataSource } from '@main/database/dataSource/SessionDataSource';
import { getOperatingSystem } from '@src/utils/helpers';
import chalk from 'chalk';
import { OS } from '@src/shared/OS';
import { Channels } from '@src/shared/ipc/channels';
import rootLogger from '@src/utils/logger';
import { setAppMenu } from '@main/core/menu/Menu';

let isQuitting = false;

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
  const sessionDataSource = container.get<SessionDataSource>(DISymbol.SessionDataSource);
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
    sessionDataSource
      .createSession(new Date(), getOperatingSystem(), app.getVersion())
      .then(() => {
        console.info(
          chalk.green(
            `启动信息记录成功: ${new Date().toISOString()} ${getOperatingSystem()} ${app.getVersion()}`,
          ),
        );
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
  app.on('before-quit', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      isQuitting = true;

      const mainWin = windowManager.get(WindowKey.MAIN);
      if (mainWin) {
        try {
          mainWin.removeAllListeners('close');
        } catch (e) {
          console.error('移除窗口关闭事件失败', e);
        }
        // 向主渲染进程请求一次“保存用”的播放器状态（与常规 request-state 区分开）
        mainWin.webContents.send(Channels.Player.RequestDump);
      }

      // 兜底强退
      setTimeout(() => {
        console.warn('强制退出：渲染进程未在超时内响应保存请求');
        app.exit(0);
      }, 3000);
    }
  });

  // 真正退出前：注销快捷键
  app.on('will-quit', () => {
    shortcutManager.unregister();
    windowManager.shutdown();
  });
}
