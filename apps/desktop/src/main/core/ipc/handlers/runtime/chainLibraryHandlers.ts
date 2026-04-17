import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { IpcContext } from './ipcContext';

export function registerChainLibraryHandlers({ trackService }: IpcContext): void {
  ipcMain.handle(Channels.ChainLibrary.GetTracks, async () => {
    return await trackService.getChainLibraryTracks();
  });

  ipcMain.handle(
    Channels.ChainLibrary.UpsertTrack,
    async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      return await trackService.upsertChainLibraryTrack(track);
    },
  );

  ipcMain.handle(
    Channels.ChainLibrary.RemoveTrack,
    async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      return await trackService.removeChainLibraryTrack(track);
    },
  );
}
