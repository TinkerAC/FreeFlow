// main/window-manager.ts
import { BrowserWindow } from 'electron';

export enum WindowKey {
  MAIN = 'MAIN',
  SECONDARY = 'SECONDARY',
}

class WindowManager {
  private windows = new Map<WindowKey, BrowserWindow>();

  get(key: WindowKey) {
    return this.windows.get(key) ?? null;
  }

  set(key: WindowKey, win: BrowserWindow) {
    this.windows.set(key, win);
    win.on('closed', () => this.windows.delete(key));
  }

  show(key: WindowKey) {
    this.get(key)?.show();
  }

  focus(key: WindowKey) {
    this.get(key)?.focus();
  }

  close(key: WindowKey) {
    this.get(key)?.close();
  }

  // 视需要添加 hide、reload 等 API
}

export const windowManager = new WindowManager();
