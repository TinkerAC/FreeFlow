import { AbstractWindow } from '@main/window/AbstractWindow';
import { isAppQuitting } from '@main/window/quitState';

declare const MUSIC_WORKSHOP_WINDOW_WEBPACK_ENTRY: string;
declare const MUSIC_WORKSHOP_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export default class MusicWorkshopWindow extends AbstractWindow {
  constructor() {
    super({
      title: 'Music Workshop',
      width: 1000,
      height: 800,
      minWidth: 800,
      minHeight: 600,
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
      // If we want to just hide it instead of destroying:
      // e.preventDefault();
      // this.hide();
      // But for a tool window, destroying it on close is usually fine unless we want to keep state.
      // Let's destroy it to save resources when not in use.
    });
  }
}
