// file: src/main/app/windowManager.ts
import { BrowserWindow } from 'electron';
import AppWindow from '@main/window/AppWindow';
import WorkerWindow from '@main/window/WorkerWindow';
import { music_Dir } from '@main/app/pathConfig';
import { attachDownloadListener } from '@main/window/downloadListener';

export enum WindowKey {
  MAIN = 'MAIN',      // 主 UI 窗口
  WORKER = 'WORKER',    // 后台下载 / 解析窗口
  SECONDARY = 'SECONDARY', // 其他备用窗口
}

export class WindowManager {
  private windows = new Map<WindowKey, BrowserWindow>();


  public createMainWindow(): BrowserWindow {
    const mainWindow = new AppWindow();
    this.windows.set(WindowKey.MAIN, mainWindow);
    return mainWindow;
  }

  public createWorkerWindow(): BrowserWindow {
    const workerWindow = new WorkerWindow();
    this.windows.set(WindowKey.WORKER, workerWindow);

    // 通过回调把“如何取得主窗”告诉监听器
    attachDownloadListener(workerWindow, {
      musicDir: music_Dir,
      getMainWindow: () => this.get(WindowKey.MAIN),
    });

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



