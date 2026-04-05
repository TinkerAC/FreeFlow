import { AbstractWindow } from '@main/window/AbstractWindow';
import { isAppQuitting } from '@main/window/quitState';

import path from 'path';

// 由 Electron Forge 注入
declare const APP_WINDOW_VITE_NAME: string;
declare const APP_WINDOW_VITE_DEV_SERVER_URL: string;

/** 主界面窗口 */
export default class AppWindow extends AbstractWindow {
  constructor() {
    super({
      frame: false, // 主界面窗口不需要边框
      // 覆写/追加差异化配置
      webPreferences: {
        preload: path.join(__dirname, 'appPreload.js'),
        // 隐藏到后台后仍保持定时器/媒体不被降频，保证向 Mini 广播进度
        backgroundThrottling: false,
        // 继承父类默认其它字段
      },
    });
    // 加载渲染进程
    if (APP_WINDOW_VITE_DEV_SERVER_URL) {
      this.safeLoadURL(`${APP_WINDOW_VITE_DEV_SERVER_URL}/app_window.html`).then(() => {
        console.log('加载主窗口成功 (URL)');
      });
    } else {
      this.safeLoadFile(path.join(__dirname, `../renderer/${APP_WINDOW_VITE_NAME}/index.html`)).then(() => {
        console.log('加载主窗口成功 (File)');
      });
    }


    this.openDevtoolsIfDev();

    // 自定义关闭行为：隐藏到托盘，但真正退出时放行
    this.on('close', (e) => {
      if (isAppQuitting()) return;
      e.preventDefault();
      this.hide();
    });
  }
}
