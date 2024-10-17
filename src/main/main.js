// main.js
import {app, BrowserWindow} from 'electron';
import {createWindow, mainWindow} from './windowManager.js';
import {createTray, tray} from './trayManager.js';
import {registerGlobalShortcuts, unregisterGlobalShortcuts} from './shortcutManager.js';
import {startProxyProcess, stopProxyProcess} from './proxyManager.js';
import {updateLocalLibrary} from '../services/localLibraryService.js';

let isQuitting = false;

app.whenReady().then(() => {
    startProxyProcess();
    createWindow();
    createTray(mainWindow);
    registerGlobalShortcuts(mainWindow);
    updateLocalLibrary();

    // 在 macOS 上，激活应用时重新创建窗口
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
    if (tray) tray.destroy();
    stopProxyProcess();
});

app.on('will-quit', () => {
    unregisterGlobalShortcuts();
});
