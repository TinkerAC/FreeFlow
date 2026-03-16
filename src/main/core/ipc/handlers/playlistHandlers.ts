import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { IpcContext } from './ipcContext';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export function registerPlaylistHandlers({ playlistService }: IpcContext): void {
  ipcMain.handle(Channels.Playlist.Create, async () => {
    return await playlistService.creatNewEmptyPlaylist();
  });

  ipcMain.handle(Channels.Playlist.GetAll, async () => {
    return await playlistService.getPlaylists();
  });

  ipcMain.handle(
    Channels.Playlist.AddTrack,
    async (_evt: IpcMainInvokeEvent, track: TrackEntity, playlistId: number) => {
      console.dir(track, { depth: null });
      return await playlistService.addTrackToPlaylist(playlistId, track);
    },
  );

  ipcMain.handle(
    Channels.Playlist.RemoveTrack,
    async (_evt: IpcMainInvokeEvent, playlistId: number, track: TrackEntity) => {
      return await playlistService.removeTrackFromPlaylist(playlistId, track);
    },
  );

  ipcMain.handle(
    Channels.Playlist.Modify,
    async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
      return await playlistService.modifyPlaylist(playlist);
    },
  );

  ipcMain.handle(Channels.Playlist.Remove, async (_evt: IpcMainInvokeEvent, playlistId: number) => {
    return await playlistService.removePlaylist(playlistId);
  });

  ipcMain.handle(Channels.Playlist.Add, async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
    return await playlistService.addPlaylist(playlist);
  });

  ipcMain.handle(
    Channels.Playlist.UpdatePositions,
    async (_evt: IpcMainInvokeEvent, updates: Array<{ playlist_id: number; position: number }>) => {
      return await playlistService.updatePlaylistPositions(updates);
    },
  );

  ipcMain.handle(
    Channels.Playlist.UpdateTrackPositions,
    async (_evt: IpcMainInvokeEvent, playlistId: number, updates: Array<{ track_id: number; position: number }>) => {
      return await playlistService.updateTrackPositions(playlistId, updates);
    },
  );
}

