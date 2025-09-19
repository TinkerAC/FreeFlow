import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Platform } from '@main/core/enum/Platform';
import { IpcContext } from './ipcContext';

export function registerTrackHandlers({ trackService, aiText, lyricService }: IpcContext): void {
  ipcMain.handle(
    Channels.Track.GetInfo,
    async (_evt: IpcMainInvokeEvent, platform: Platform, platform_unique_id: string) => {
      return await trackService.getTrackInfo(platform, platform_unique_id);
    },
  );

  ipcMain.handle(
    Channels.Library.AddTrackToLibrary,
    async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      return await trackService.addTrackToLibrary(track);
    },
  );

  ipcMain.handle(
    Channels.Library.RemoveTrackFromLibrary,
    async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      return await trackService.removeTrackFromLibrary(track);
    },
  );

  ipcMain.handle(
    Channels.Track.UpdateBasic,
    async (
      _evt: IpcMainInvokeEvent,
      payload: { platform: string; platform_unique_id: string; title?: string; artist?: string; album?: string },
    ) => {
      if (!payload || typeof payload.platform !== 'string' || typeof payload.platform_unique_id !== 'string') {
        throw new Error('invalid payload');
      }
      return await trackService.updateBasicInfo(payload);
    },
  );

  ipcMain.handle(
    Channels.Track.CleanBasic,
    async (_evt: IpcMainInvokeEvent, payload: { title: string; artist?: string; album?: string }) => {
      const { title, artist, album } = payload || { title: '' };
      return await aiText.cleanBasic(String(title ?? ''), String(artist ?? ''), String(album ?? ''));
    },
  );

  ipcMain.handle(Channels.Lyrics.Get, async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
    console.log('IPC: 获取歌词:', track);
    return await lyricService.getLyrics(track);
  });

  ipcMain.on(Channels.Library.IncreasePlayCount, async (_evt: IpcMainEvent, track: TrackEntity) => {
    console.log('IPC: 增加播放次数:', track);
    try {
      await trackService.increasePlayCount(track);
    } catch (error) {
      console.error('增加播放次数失败:', error);
    }
  });
}
