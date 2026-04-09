import { AbstractWindow } from '@main/window/AbstractWindow';
import { isAppQuitting } from '@main/window/quitState';

declare const MUSIC_WORKSHOP_WINDOW_WEBPACK_ENTRY: string;
declare const MUSIC_WORKSHOP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export default class MusicWorkshopWindow extends AbstractWindow {
  constructor() {
    super({
      title: 'Creators Workshop',
      width: 1340,
      height: 900,
      minWidth: 1120,
      minHeight: 720,
      webPreferences: {
        preload: MUSIC_WORKSHOP_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    this.safeLoadURL(MUSIC_WORKSHOP_WINDOW_WEBPACK_ENTRY);
    this.openDevtoolsIfDev();

    this.on('close', (e) => {
      if (isAppQuitting()) return;
    });
  }
}
