import { BrowserWindow, ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { WindowKey } from '@main/window/windowManager';
import { IpcContext } from './ipcContext';

export function registerWindowHandlers({ windowManager, configService }: IpcContext): void {
  const requestMiniPlayerState = (mini: BrowserWindow) => {
    const main = windowManager.get(WindowKey.MAIN);
    if (!main) return;
    const ask = () => main.webContents.send(Channels.Player.RequestState);
    const wc = mini.webContents;
    if (wc.isLoadingMainFrame()) wc.once('did-finish-load', ask);
    else setTimeout(ask, 0);
  };

  ipcMain.handle(Channels.MiniPlayer.Toggle, async () => {
    const mini = windowManager.toggleMiniPlayer(configService);
    if (mini) requestMiniPlayerState(mini);
  });

  ipcMain.handle(Channels.MiniPlayer.Show, async () => {
    const mini = windowManager.showMiniPlayer(configService);
    requestMiniPlayerState(mini);
  });

  ipcMain.handle(Channels.MiniPlayer.Hide, async () => {
    windowManager.hideMiniPlayer();
  });

  ipcMain.handle(Channels.MiniPlayer.SetExpanded, async (_evt, payload: { expanded: boolean }) => {
    if (!payload || typeof payload.expanded !== 'boolean') {
      console.warn('[mini-player:set-expanded] invalid payload');
      return;
    }
    windowManager.setMiniPlayerExpanded(payload.expanded);
  });
}
