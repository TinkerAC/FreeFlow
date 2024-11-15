import {app, BrowserWindow} from 'electron';
import {createWindow, mainWindow} from './windowManager.js';
import {createTray, tray} from './trayManager.js';
import {registerGlobalShortcuts, unregisterGlobalShortcuts} from './shortcutManager.js';
import {startProxyProcess, stopProxyProcess} from './proxyManager.js';
import {getDatabase} from "../utils/dbUtils.js";
import {dbPath} from "./pathConfig.js";

let isQuitting = false;
let db;

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock && process.env.NODE_ENV !== 'development') { //开发环境下不作限制
    console.log('Another instance is already running, quitting...');
    // 如果无法获得锁，说明已经有一个实例在运行，直接退出应用
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
        db = await getDatabase(dbPath);  // 初始化数据库

        await startProxyProcess();            // 启动代理进程
        createWindow(db);               // 创建主窗口

        // 在 Windows 上，创建系统托盘图标
        if (process.platform === 'win32') {
            createTray(mainWindow);
        }  // 创建系统托盘图标
        registerGlobalShortcuts(mainWindow);  // 注册全局快捷键

        // 在 macOS 上，激活应用时重新创建窗口
        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow(db);
            }
        });
    });

    // 处理应用退出
    app.on('before-quit', (event) => {
        if (!isQuitting) {
            event.preventDefault(); // 阻止默认退出行为
            isQuitting = true;

            if (tray) tray.destroy(); // 销毁系统托盘图标
            stopProxyProcess();       // 停止代理进程
            // 发送请求渲染进程获取播放器状态
            mainWindow.webContents.send('request-player-state');
        }
    });


    // 在应用即将退出时，注销快捷键和关闭数据库连接
    app.on('will-quit', () => {
        unregisterGlobalShortcuts();
        if (db) db.close();  // 关闭数据库连接

    });
}
