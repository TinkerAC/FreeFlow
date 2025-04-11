// file: src/main/ipc.ts
import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import PlaylistService from '@main/services/playlistService';
import { loadPlayer, savePlayer } from '@main/services/playerService';
import { dataPath, dbPath, playerStateDumpFile } from './pathConfig';
import { ModelFactory, PlayerState, PlaylistModel, TrackModel } from '@src/shared/types';
import { container } from '@main/di/di-container';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { Platform } from '@main/enum/Platform';
import Store from 'electron-store';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';


const hifiniMusic: HifiniMusic = container.get('HifiniMusic');
const playlistService: PlaylistService = container.get('PlaylistService');
const store: Store = container.get('Store');
const trackService: TrackService = container.get('TrackService');
const netEaseCloudMusic: NetEaseCloudMusic = container.get('NetEaseCloudMusic');
const qqMusic: QQMusic = container.get('QQMusic');
const lyricService: LyricService = container.get('LyricService');


export function setupIpcHandlers(mainWindow: BrowserWindow): void {


  ipcMain.handle('get-platformContext', async () => {
    return process.platform;
  });


  // 窗口控制事件
  ipcMain.on('window-controls', (event: IpcMainEvent, action: string) => {
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.hide();
        break;
      default:
        console.error('Unknown action:', action);
    }
  });

  // 创建歌单事件
  ipcMain.handle('create-playlists', async () => {
    return await playlistService.creatNewEmptyPlaylist();
  });

  // 获取歌单事件
  ipcMain.handle('get-playlists', async () => {
    return await playlistService.getPlaylists();
  });

  // 获取播放器状态事件
  ipcMain.handle('load-player-state', async () => {
    return loadPlayer(playerStateDumpFile);
  });

  // 获取曲目信息事件
  ipcMain.handle(
    'get-track-info'
    , async (_event: IpcMainInvokeEvent, platform: Platform, platform_unique_id: string) => {
      return await trackService.getTrackInfo(platform, platform_unique_id);
    },
  );

  ipcMain.handle('get-search-result', async (event, keywords) => {
    console.log('后端收到搜索请求:', keywords);
    const [hifini_results, netease_results, netease_playlist_results, qq_music_result] = await Promise.all([
      hifiniMusic.searchTracks(keywords),
      netEaseCloudMusic.searchTracks(keywords),
      netEaseCloudMusic.cloudSearchPlaylist(keywords),
      qqMusic.searchTracks(keywords),
    ]);

    return {
      tracks: hifini_results.concat(netease_results, qq_music_result),
      playlists: netease_playlist_results,
    };
  });

  // 解析音乐链接事件
  ipcMain.handle('get-music-link', async (event: IpcMainInvokeEvent, dataHref: string) => {
    try {
      return await hifiniMusic.getTrackLink(dataHref);
    } catch (error) {
      console.error('Error in get-music-link:', error);
      throw error;
    }
  });

  // 添加音乐到库事件
  ipcMain.handle('add-track-to-libraryContext', async (_event: IpcMainInvokeEvent, track: TrackModel) => {
    return await trackService.addTrackToLibrary(track);
  });

  // 添加音乐到歌单事件
  ipcMain.handle(
    'add-track-to-playlist', async (_event: IpcMainInvokeEvent, track: TrackModel, playlistId: number) => {
      console.dir(track, { depth: null });
      return await playlistService.addTrackToPlaylist(playlistId, track);
    },
  );

  // 从歌单中删除音乐事件
  ipcMain.handle(
    'remove-track-from-playlistContext',
    async (_event: IpcMainInvokeEvent, playlistId: number, track: TrackModel) => {
      return await playlistService.removeTrackFromPlaylist(playlistId, track);
    },
  );

  ipcMain.handle('get-user-data-path', async () => {
    return dataPath;
  });

  // 监听渲染端发送的回复播放器状态事件
  ipcMain.once('reply-player-state', (_event: IpcMainEvent, state: PlayerState) => {
    console.log('主进程已收到播放器状态:', state);
    savePlayer(playerStateDumpFile, state);
    app.quit();
  });

  // 修改歌单事件
  ipcMain.handle(
    'modify-playlistContext',
    async (
      _event: IpcMainInvokeEvent,
      playlistModel: PlaylistModel,
    ) => {
      return await playlistService.modifyPlaylist(playlistModel);
    });

  // 删除歌单事件
  ipcMain.handle('remove-playlistContext', async (_event: IpcMainInvokeEvent, playlistId: number) => {
    return await playlistService.removePlaylist(playlistId);
  });

  ipcMain.handle('get-configContext', (_event: IpcMainInvokeEvent, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('set-configContext', (_event: IpcMainInvokeEvent, key: string, value: string) => {
    store.set(key, value);
    return true;
  });


  ipcMain.handle('remove-track-from-libraryContext', async (_event: IpcMainInvokeEvent, track: TrackModel) => {
    return await trackService.removeTrackFromLibrary(track);
  });


  ipcMain.handle('get-netease-cloud-music-playlistContext-detail', async (_event: IpcMainInvokeEvent, playlist_id: string) => {
    return await netEaseCloudMusic.getPlaylistDetail(playlist_id);
  });

  ipcMain.handle('add-playlistContext', async (_event: IpcMainInvokeEvent, playlist: PlaylistModel) => {
    return await playlistService.addPlaylist(playlist);
  });

  ipcMain.handle('get-lyrics', async (_event: IpcMainInvokeEvent, track_model: TrackModel) => {
    //如果 track_model 不是TrackModel 的实例,调用工厂方法创建一个
    if (!(track_model instanceof TrackModel)) {
      track_model = ModelFactory.buildTrackModel(track_model);
    }

    return await lyricService.getLyrics(track_model);

  });


  ipcMain.on('reveal-database-in-file-system', async () => {
    const { shell } = require('electron');
    shell.showItemInFolder(dbPath);
  });

}