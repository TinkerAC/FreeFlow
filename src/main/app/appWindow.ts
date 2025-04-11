// file: src/main/appWindow.ts
import {  BrowserWindow } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipcHandlers';

// Electron Forge automatically creates these entry points
declare const APP_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let appWindow: BrowserWindow;

/**
 * Create Application Window
 * @returns {BrowserWindow} Application Window Instance
 */
export function createAppWindow(): BrowserWindow {
  // Create new window instance
  appWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#202020',
    show: false,
    frame: false,
    autoHideMenuBar: true,
    icon: path.resolve('assets/images/appIcon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
      sandbox: false,
      webSecurity: true, // 开启以确保 CORS 生效
    },
  });

  // Load the index.html of the app window.
  appWindow.loadURL(APP_WINDOW_WEBPACK_ENTRY).then(() => {
    console.log('加载主窗口成功');
  });

  // Show the window when it's ready to
  appWindow.on('ready-to-show', () => appWindow.show());

  // 初始化 IPC 事件处理
  setupIpcHandlers(appWindow)

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    appWindow.webContents.openDevTools();
  }

  // 窗口事件处理
  appWindow.on('close', () => {
    //hide 主窗口
    appWindow.hide();
  });

  appWindow.on('hide', () => {
    console.log('窗口已隐藏');
  });

  appWindow.on('show', () => {
    console.log('窗口已显示');
  });

  return appWindow;
}


