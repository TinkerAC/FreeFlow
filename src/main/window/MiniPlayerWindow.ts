import { AbstractWindow } from '@main/window/AbstractWindow';

import path from 'path';

// 由 Electron Forge 注入
declare const APP_WINDOW_VITE_NAME: string;
declare const APP_WINDOW_VITE_DEV_SERVER_URL: string;

/** 迷你播放器窗口（置顶、小巧、无边框、圆角） */
export default class MiniPlayerWindow extends AbstractWindow {
  constructor() {
    super({
      width: 360,
      height: 100,
      minWidth: 220,
      minHeight: 100,
      frame: false,
      show: false,
      transparent: false,
      resizable: true,
      alwaysOnTop: true,
      backgroundColor: '#202020',
      webPreferences: {
        preload: path.join(__dirname, 'appPreload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // Mini 窗口同样不降频，保证 UI 动画/渲染流畅
        backgroundThrottling: false,
      },
    });

    // 加载渲染进程（同入口，通过 hash 路由进入迷你播放器）
    if (APP_WINDOW_VITE_DEV_SERVER_URL) {
      const url = `${APP_WINDOW_VITE_DEV_SERVER_URL}/app_window.html#/mini`;
      this.safeLoadURL(url).then(() => {
        // no-op
      });
    } else {
      const url = `file://${path.join(__dirname, `../renderer/${APP_WINDOW_VITE_NAME}/index.html`)}#/mini`;
      this.safeLoadURL(url).then(() => {
        // no-op
      });
    }

    // 迷你窗口关闭则销毁
    this.removeAllListeners('close');
    this.on('close', () => this.destroy());
  }
}
