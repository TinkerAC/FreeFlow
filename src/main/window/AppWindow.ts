import { AbstractWindow } from '@main/window/AbstractWindow';

// 由 Electron Forge 注入
declare const APP_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

/** 主界面窗口 */
export default class AppWindow extends AbstractWindow {
  constructor() {
    super({
      // 覆写/追加差异化配置
      webPreferences: {
        preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
        // 继承父类默认其它字段
      },
    });
    // 加载渲染进程
    this.safeLoadURL(APP_WINDOW_WEBPACK_ENTRY).then(() => {
      console.log('加载主窗口成功');
    });


    this.openDevtoolsIfDev();

    // 自定义关闭行为：隐藏到托盘
    this.on('close', (e) => {
      e.preventDefault();
      this.hide();
    });
  }
}
