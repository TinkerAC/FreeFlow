// file: src/main/app.ts
import { app, BrowserWindow, Tray } from 'electron';
import { createAppWindow } from './appWindow';
import electronSquirrelStartup from 'electron-squirrel-startup';
import { createTray } from './trayManager';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcutManager';
import ProxyServerManager from './proxyServer';
import { initConfig } from './configInit';

import { container } from '@main/di/di-container';
import LocalLibraryService from '@main/services/localLibraryService';
import { sequelize } from '@main/models';
import { is_hifini_cookies_expired } from '@main/services/AuthService';
import Store from 'electron-store';

let isQuitting = false;

let mainWindow: BrowserWindow;
let tray: Tray;


// 初始化数据库


// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock && process.env.NODE_ENV !== 'development') {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  console.log('App is running...');
  // 如果获得了锁，继续启动应用并监听第二个实例的请求
  app.on('second-instance', async () => {
    // 当用户试图再次启动应用时，这里会被触发
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore(); // 恢复最小化的窗口
      mainWindow.focus(); // 将窗口置于前台
    }
  });

  /** Handle creating/removing shortcuts on Windows when installing/uninstalling. */
  if (electronSquirrelStartup) {
    app.quit();
  }

  const localLibraryServiceInstance = container.get<LocalLibraryService>('LocalLibraryService');
  const store: Store = container.get('Store');
  const proxyServerManager = container.get<ProxyServerManager>('ProxyServerManager');

  // 在 app 准备好时执行初始化工作
  app.whenReady().then(async () => {



    await sequelize.sync(); // 同步数据库

    await initConfig(store); // 初始化配置



    await localLibraryServiceInstance.updateLocalLibrary(); // 更新本地音乐库

    await proxyServerManager.start(); // 启动代理服务器

    mainWindow = createAppWindow(); // 创建主窗口

    //检查hifini 登陆是否过期, 如果过期则提醒用户重新登陆

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const cookies: { [key: string]: string } = store.get('hifini_cookie');
    console.log('cookies:', cookies);
    const is_hifini_cookies_expired_result = await is_hifini_cookies_expired(cookies);

    if (is_hifini_cookies_expired_result) {
      mainWindow.webContents.send('notification', 'Hifini 登陆已过期，请重新登陆');
    }

    // 在 Windows 上，创建系统托盘图标
    if (process.platform === 'win32') {
      tray = createTray(mainWindow);
    }


    registerGlobalShortcuts(mainWindow); // 注册全局快捷键
  });

  /**
   * Emitted when the application is activated. Various actions can
   * trigger this event, such as launching the application for the first time,
   * attempting to re-launch the application when it's already running,
   * or clicking on the application's dock or taskbar icon.
   */
  app.on('activate', () => {
    /**
     * On macOS, it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open.
     */
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      mainWindow = createAppWindow();
    }
  });

  /**
   * Emitted when all windows have been closed.
   */
  app.on('window-all-closed', () => {
    /**
     * On macOS, it is common for applications and their menu bar
     * to stay active until the user quits explicitly with Cmd + Q
     */
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // 处理应用退出
  app.on('before-quit', (event) => {
    if (!isQuitting) {
      event.preventDefault(); // 阻止默认退出行为
      isQuitting = true;
      if (tray) tray.destroy(); // 销毁系统托盘图标

      // 发送请求给渲染进程获取播放器状态
      mainWindow.webContents.send('request-player-state');
      console.log('主进程已发送请求获取播放器状态');


    }

  });

  // 在应用即将退出时，注销快捷键和关闭数据库连接
  app.on('will-quit', () => {
    unregisterGlobalShortcuts();
  });
}