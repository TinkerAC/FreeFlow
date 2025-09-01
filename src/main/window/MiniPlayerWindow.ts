import { AbstractWindow } from '@main/window/AbstractWindow';

// 由 Electron Forge 注入（与主窗口相同入口，使用路由区分）
declare const APP_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

/** 迷你播放器窗口（置顶、小巧、无边框、圆角） */
export default class MiniPlayerWindow extends AbstractWindow {
  constructor() {
    super({
      width: 360,
      height: 140,
      minWidth: 220,
      minHeight: 140,
      frame: false,
      show: false,
      transparent: false,
      resizable: true,
      alwaysOnTop: true,
      backgroundColor: '#202020',
      webPreferences: {
        preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        // Mini 窗口同样不降频，保证 UI 动画/渲染流畅
        backgroundThrottling: false,
      },
    });

    // 加载渲染进程（同入口，通过 hash 路由进入迷你播放器）
    const url = `${APP_WINDOW_WEBPACK_ENTRY}#/mini`;
    this.safeLoadURL(url).then(() => {
      // no-op
    });

    // 迷你窗口关闭则销毁
    this.removeAllListeners('close');
    this.on('close', () => this.destroy());
  }
}
