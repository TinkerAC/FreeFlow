// file: src/main/core/windowManager.ts
import { BrowserWindow } from 'electron';
import AppWindow from '@main/window/AppWindow';
import WorkerWindow from '@main/window/WorkerWindow';

export enum WindowKey {
  MAIN = 'MAIN',      // 主 UI 窗口
  WORKER = 'WORKER',    // 后台下载 / 解析窗口
}

export class WindowManager {

  private windows = new Map<WindowKey, BrowserWindow>();

  constructor() {
  }

  public createMainWindow(): BrowserWindow {
    const mainWindow = new AppWindow();
    this.set(WindowKey.MAIN, mainWindow);
    return mainWindow;
  }

  public createWorkerWindow(): BrowserWindow {
    const workerWindow = new WorkerWindow();
    this.set(WindowKey.WORKER, workerWindow);
    return workerWindow;
  }


  


  get(key: WindowKey): BrowserWindow | null {
    return this.windows.get(key) ?? null;
  }

  set(key: WindowKey, win: BrowserWindow): void {
    this.windows.set(key, win);
    win.on('closed', () => this.windows.delete(key));
  }


  show(key: WindowKey): void {
    const window = this.get(key);
    if (window?.isDestroyed()) {
      console.warn(`窗口 ${key} 已经被销毁`);
      return;
    }

    if (!this.windows.has(key)) {
      console.warn(`窗口 ${key} 不存在,正在创建新实例`);
      switch (key) {
        case WindowKey.MAIN:
          this.createMainWindow();
          break;
        case WindowKey.WORKER:
          this.createWorkerWindow();
          break;
        
        default:
          console.warn(`未知窗口类型: ${key}`);
          return;
      }
    }

    this.get(key)?.show();
  }

  activate(key: WindowKey): void {
    const win = this.get(key);
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  }

  focus(key: WindowKey): void {
    const win = this.get(key);
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  }


  public shutdown(): void {
    this.windows.forEach((win) => {
      try {
        win.removeAllListeners();
        win.close();
      } catch (e) {
        console.warn('关闭窗口失败,可能是因为窗口已经关闭', e);
      }

    });
    this.windows.clear();
  }

}


