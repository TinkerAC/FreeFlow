import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { loadPlayer, savePlayer } from '@main/services/PlayerService';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { WindowKey } from '@main/window/windowManager';
import { IpcContext } from './ipcContext';
import rootLogger from '@src/utils/logger';

export function registerPlayerHandlers({ windowManager, dataPath }: IpcContext): void {
  let lastPlayerState: PlayerState | null = null;

  const mainWindow = windowManager.get(WindowKey.MAIN);
  ipcMain.handle(Channels.Player.LoadState, async () => loadPlayer(dataPath.playerStateDumpFile));

  ipcMain.on(Channels.Player.ReplyState, (_evt: IpcMainEvent, state: PlayerState, terminate: boolean) => {
    rootLogger.info(`[IPC][Player] 保存播放器状态，terminate=${terminate}`);
    savePlayer(dataPath.playerStateDumpFile, state);
    if (terminate) {
      console.log('应用即将退出，播放器状态已保存。');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.destroy();
      }
      app.quit();
    }
  });

  ipcMain.on(Channels.Player.Control, (evt, cmd: string, payload: any) => {
    const allowed = new Set(['play', 'pause', 'toggle', 'next', 'prev', 'seek', 'setVolume']);
    if (!allowed.has(String(cmd))) {
      console.warn('[player:control] invalid cmd:', cmd);
      return;
    }
    const main = windowManager.get(WindowKey.MAIN);
    main?.webContents.send(Channels.Player.Control, cmd, payload);
  });

  ipcMain.on(Channels.Player.State, (evt, state: PlayerState) => {
    lastPlayerState = state;
    const candidates: (BrowserWindow | null)[] = [
      windowManager.get(WindowKey.MAIN),
      windowManager.get(WindowKey.MINI),
      windowManager.get(WindowKey.WORKER),
    ];
    const targets = candidates
      .filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
      .filter((w) => w.webContents.id !== evt.sender.id);

    let delivered = 0;
    for (const w of targets) {
      try {
        w.webContents.send(Channels.Player.State, state);
        delivered++;
      } catch {
        // ignore
      }
    }
  });

  ipcMain.on(Channels.Player.RequestState, (evt) => {
    if (lastPlayerState) {
      try {
        evt.sender.send(Channels.Player.State, lastPlayerState);
      } catch {
        // ignore
      }
    }
    const main = windowManager.get(WindowKey.MAIN);
    main?.webContents.send(Channels.Player.RequestState);
  });
}

