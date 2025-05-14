// file: src/main/core/core.ts
import { app, Tray } from 'electron';
import { WindowKey, WindowManager } from './window/windowManager';
import electronSquirrelStartup from 'electron-squirrel-startup';
import { createTray } from '@main/core/trayManager';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from '@main/core/shortcutManager';

import ProxyServerManager from '@main/core/AudioProxyServer';
import { initConfig } from '@main/core/configInit';

import LocalLibraryService from '@main/services/localLibraryService';
import { sequelize } from '@main/database/seqimpl';
import { is_hifini_cookies_expired } from '@main/services/AuthService';
import Store from 'electron-store';
import { container } from '@main/di/di-container';
import { DiSymbol } from '@main/di/symbol';
import IpcController from '@main/core/IpcController';

let isQuitting = false;
let tray: Tray;

// ───────────────────────────────────────────────────────────
// 单实例锁
// ───────────────────────────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock && process.env.NODE_ENV !== 'development') {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  console.log('App is running...');

  const windowManager = container.get<WindowManager>(DiSymbol.WindowManager);
  // 若用户再次启动应用，将唤起已有主窗口
  app.on('second-instance', () => {
    windowManager.focus(WindowKey.MAIN);
  });

  // squirrel 自启动场景（Windows 安装/卸载）
  if (electronSquirrelStartup) {
    app.quit();
  }

  // 依赖注入获取服务实例
  const localLibraryService = container.get<LocalLibraryService>(DiSymbol.LocalLibraryService);
  const store: Store = container.get(DiSymbol.Store);
  const proxyServerManager = container.get<ProxyServerManager>(DiSymbol.ProxyServerManager);
  const ipcController = container.get<IpcController>(DiSymbol.IpcController);
  // ─────────────────────────────────────────────────────────
  // READY 阶段
  // ─────────────────────────────────────────────────────────
  app.whenReady().then(async () => {
    await sequelize.sync(
      // { force: false, alter: true, logging: true },  // 是否强制同步数据库
    );
    await initConfig(store);                // 初始化配置
    await localLibraryService.updateLocalLibrary();
    await proxyServerManager.start();       // 启动本地代理

    const mainWindow = windowManager.createMainWindow();

    await ipcController.register();
    windowManager.createWorkerWindow();

    // 检查 hifini Cookie 过期状态
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const cookies: { [key: string]: string } = store.get('hifini_cookie');
    console.log('cookies:', cookies);
    if (await is_hifini_cookies_expired(cookies)) {
      mainWindow.webContents.send('notification', 'Hifini 登陆已过期，请重新登陆');
    }

    // Windows 创建系统托盘
    if (process.platform === 'win32') {
      tray = createTray(mainWindow);
    }

    // 注册全局快捷键
    registerGlobalShortcuts(mainWindow);
  });

  // ─────────────────────────────────────────────────────────
  // Dock / 任务栏 被点击激活
  // ─────────────────────────────────────────────────────────
  app.on('activate', () => {
    const mainWin = windowManager.get(WindowKey.MAIN);
    if (mainWin) {
      if (mainWin.isMinimized()) mainWin.restore();
      if (!mainWin.isVisible()) mainWin.show();
      mainWin.focus();
    } else {
      // const newMain = createAppWindow();
      // windowManager.set(WindowKey.MAIN, newMain);
      windowManager.activate(WindowKey.MAIN);
    }
  });

  // ─────────────────────────────────────────────────────────
  // 所有窗口关闭
  // ─────────────────────────────────────────────────────────
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  // ─────────────────────────────────────────────────────────
  // 触发退出
  // ─────────────────────────────────────────────────────────
  // core.ts
  app.on('before-quit', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      isQuitting = true;

      // ↓ 关键：让窗口真正能够关闭
      const mainWin = windowManager.get(WindowKey.MAIN);
      if (mainWin) {
        try {
          mainWin.removeAllListeners('close');  // 不再拦截
        } catch (e) {
          console.error('移除窗口关闭事件失败', e);
        }
        // 也可以直接 mainWin.destroy();
      }

      mainWin?.webContents.send('request-player-state');
    }
  });

  // 真正退出前：注销快捷键
  app.on('will-quit', () => {
    unregisterGlobalShortcuts();
    windowManager.shutdown();
  });
}
