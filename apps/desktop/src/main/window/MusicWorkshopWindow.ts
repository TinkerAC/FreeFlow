import { AbstractWindow } from '@main/window/AbstractWindow';
import { isAppQuitting } from '@main/window/quitState';

import path from 'path';

declare const APP_WINDOW_VITE_NAME: string;
declare const APP_WINDOW_VITE_DEV_SERVER_URL: string;

export default class MusicWorkshopWindow extends AbstractWindow {
  constructor() {
    super({
      title: 'Music Workshop',
      width: 1000,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'appPreload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    if (APP_WINDOW_VITE_DEV_SERVER_URL) {
      this.safeLoadURL(`${APP_WINDOW_VITE_DEV_SERVER_URL}/music_workshop_window.html`);
    } else {
      this.safeLoadFile(path.join(__dirname, `../renderer/${APP_WINDOW_VITE_NAME}/music_workshop_window.html`));
    }
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
