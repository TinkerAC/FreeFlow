import {app, BrowserWindow} from 'electron';
import {createWindow} from './windowManager.js';
import {createTray} from './trayManager.js';
import {registerGlobalShortcuts, unregisterGlobalShortcuts} from './shortcutManager.js';
import {startProxyServer} from './proxyServer.js'; // 引入代理服务器模块
import {getDatabase} from './../utils/dbUtils.js';
import {dbPath} from './pathConfig.js';
import {updateLocalLibrary} from './../services/localLibraryService.js';
import {initConfig} from './configInit.js';
import Store from 'electron-store';

let isQuitting = false;
let db;
let mainWindow;
let tray;

let store = new Store({
    watch: true,
});

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock && process.env.NODE_ENV !== 'development') { // 开发环境下不作限制
    console.log('Another instance is already running, quitting...');
    app.quit();
} else {
    console.log('App is running...');
    // 如果获得了锁，继续启动应用并监听第二个实例的请求
    app.on('second-instance', async (event, commandLine, workingDirectory) => {
        // 当用户试图再次启动应用时，这里会被触发
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore(); // 恢复最小化的窗口
            mainWindow.focus(); // 将窗口置于前台
        }
    });

    // 在 app 准备好时执行初始化工作
    app.whenReady().then(async () => {
        await initConfig(store); // 初始化配置

        db = await getDatabase(dbPath); // 初始化数据库

        await updateLocalLibrary(db, store); // 更新本地音乐库

        await startProxyServer(db, store); // 启动代理服务器

        mainWindow = createWindow(db, store); // 创建主窗口

        // 在 Windows 上，创建系统托盘图标
        if (process.platform === 'win32') {
            tray = createTray(mainWindow);
        } // 创建系统托盘图标
        registerGlobalShortcuts(mainWindow); // 注册全局快捷键

        // 在 macOS 上，激活应用时重新创建窗口
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                mainWindow = createWindow(db, store);
            }
        });
    });

    // 处理应用退出
    app.on('before-quit', (event) => {
        if (!isQuitting) {
            event.preventDefault(); // 阻止默认退出行为
            isQuitting = true;

            if (tray) tray.destroy(); // 销毁系统托盘图标
            // 不再需要停止代理进程，因为它已集成到主进程中
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
