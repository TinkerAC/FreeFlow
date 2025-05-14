import { AbstractWindow } from '@main/window/AbstractWindow';

declare const APP_WINDOW_WEBPACK_ENTRY: string;
declare const APP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class PreferenceWindow extends AbstractWindow {
  constructor() {
    super(
      {
        width: 800,
        height: 600,
        show: false,
        frame: true,
        webPreferences: {
          preload: APP_WINDOW_PRELOAD_WEBPACK_ENTRY,
        },
      });


    this.safeLoadURL(APP_WINDOW_WEBPACK_ENTRY + '#/settings').then(() => {
      console.log('加载设置窗口成功');
    });

    this.removeAllListeners('close');
    this.on('close', () => {
      this.destroy();
      //notify windowManager to remove this window
    });
  }
}