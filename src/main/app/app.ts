// file: src/main/app.ts
import { app, BrowserWindow } from 'electron';
import { createAppWindow } from './appWindow';
import electronSquirrelStartup from 'electron-squirrel-startup';
import { createTray } from './trayManager';
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from './shortcutManager';
import { startProxyServer } from './proxyServer';
import { getDatabase } from '@src/utils/dbUtils';
import { dbPath } from './pathConfig';
import { updateLocalLibrary } from '@main/services/localLibraryService';
import { initConfig } from './configInit';
import Store from 'electron-store';
import { Database } from 'sqlite3';

let isQuitting = false;
let db: Database;
let mainWindow: BrowserWindow;
let tray: any;
const store = new Store({
  watch: true,
});

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

  // 在 app 准备好时执行初始化工作
  app.whenReady().then(async () => {
    await initConfig(store); // 初始化配置

    db = await getDatabase(dbPath); // 初始化数据库

    await updateLocalLibrary(db, store); // 更新本地音乐库

    await startProxyServer(db, store); // 启动代理服务器

    mainWindow = createAppWindow(db, store); // 创建主窗口

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
     * On macOS it's common to re-create a window in the app when the
     * dock icon is clicked and there are no other windows open.
     */
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    } else {
      mainWindow = createAppWindow(db, store);
    }
  });

  /**
   * Emitted when all windows have been closed.
   */
  app.on('window-all-closed', () => {
    /**
     * On macOS it is common for applications and their menu bar
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
    }
  });

  // 在应用即将退出时，注销快捷键和关闭数据库连接
  app.on('will-quit', () => {
    unregisterGlobalShortcuts();
    if (db) db.close(); // 关闭数据库连接
  });
}