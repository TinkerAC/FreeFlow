import { AbstractWindow } from '@main/window/AbstractWindow';

declare const PROFILE_GUIDE_WINDOW_WEBPACK_ENTRY: string;
declare const PROFILE_GUIDE_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export default class ProfileGuideWindow extends AbstractWindow {
  constructor() {
    super({
      title: 'FreeFlow Profile',
      width: 620,
      height: 700,
      minWidth: 640,
      minHeight: 440,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      backgroundColor: '#171a21',
      webPreferences: {
        preload: PROFILE_GUIDE_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    this.safeLoadURL(PROFILE_GUIDE_WINDOW_WEBPACK_ENTRY);
  }
}
