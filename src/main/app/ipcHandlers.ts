// file: src/main/ipcHandlers.ts
import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { Database } from 'sqlite3';
import {
  addTrackToPlaylist,
  creatNewEmptyPlaylist,
  extractMusicMeta,
  getPlaylists,
  modifyPlaylist,
  parseTrackInfo,
  removePlaylist,
  removeTrackFromPlaylist,
} from '@main/services/playlistService';
import { addTrackToLibrary, isTrackInLibrary } from '@main/services/libraryService';
import { loadPlayer, savePlayer } from '@main/services/playerService';
import { getMusicInfo, getMusicLink, getSearchResults } from '@main/services/hifiniMusicService';
import { dataPath, playerStateDumpFile } from './pathConfig';
import { dbGet } from '@src/utils/dbUtils';

export function setupIpcHandlers(mainWindow: BrowserWindow, db: Database, store: any): void {


  ipcMain.handle('get-platform', async () => {
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
  ipcMain.handle('create-playlists', async (event: IpcMainInvokeEvent) => {
    try {
      await creatNewEmptyPlaylist(db, '新建歌单这是一个新建的歌单');
    } catch (error) {
      console.error('Error in create-playlists:', error);
    }
  });

  // 获取歌单事件
  ipcMain.handle('get-playlists', async (event: IpcMainInvokeEvent) => {
    try {
      return await getPlaylists(db);
    } catch (error) {
      console.error('Error in get-playlists:', error);
      throw error;
    }
  });

  // 获取播放器状态事件
  ipcMain.handle('player-state', () => {
    return loadPlayer(playerStateDumpFile);
  });

  // 获取曲目信息事件
  ipcMain.handle(
    'get-track-info',
    async (event: IpcMainInvokeEvent, file_path?: string, data_href?: string) => {
      try {
        if (file_path) {
          // 如果是本地文件,提取元数据
          const metaData = await extractMusicMeta(file_path);
          return parseTrackInfo(metaData);
        } else if (data_href) {
          return await getMusicInfo(data_href, db, store);
        } else {
          console.error('Error in get-track-info: no file_path or data_href provided');
        }
      } catch (error) {
        console.error('Error in get-track-info:', error);
        throw error;
      }
    },
  );

  // 搜索音乐事件
  ipcMain.handle('get-search-results', async (event: IpcMainInvokeEvent, searchTerm: string) => {
    console.log('后端收到搜索请求:', searchTerm);
    try {
      const results = await getSearchResults(searchTerm, db, store);
      console.log('搜索结果:', results);
      return results;
    } catch (error) {
      console.error('Error in get-search-results:', error);
      throw error;
    }
  });

  // 解析音乐链接事件
  ipcMain.handle('get-music-link', async (event: IpcMainInvokeEvent, dataHref: string) => {
    try {
      return await getMusicLink(dataHref, db, store);
    } catch (error) {
      console.error('Error in get-music-link:', error);
      throw error;
    }
  });

  // 添加音乐到库事件
  ipcMain.handle('add-track-to-library', async (event: IpcMainInvokeEvent, track: any) => {
    const tk = {
      data_href: track.data_href,
      file_path: track.file_path,
    };

    const track_id = await isTrackInLibrary(tk, db);

    if (track_id) {
      console.log('待添加的音乐已在库中，track_id:', track_id);
      return track_id;
    }

    return addTrackToLibrary(tk, db);
  });

  // 添加音乐到歌单事件
  ipcMain.handle(
    'add-track-to-playlist',
    async (event: IpcMainInvokeEvent, track: any, playlistId: number) => {
      let trackId: number;

      try {
        // 先检查歌曲是否在库中
        const row: any
          = await dbGet(db, 'SELECT track_id FROM library WHERE data_href = ? OR file_path = ?', [
          track.data_href,
          track.file_path,
        ]);

        if (!row) {
          // 如果不在库中，先添加到库
          trackId = await addTrackToLibrary(track, db);
          console.log(`待插入歌单歌曲不在库中，已添加到库，track_id: ${trackId}`);
        } else {
          trackId = row.track_id;
          console.log(`待插入歌单的歌曲已在库中，track_id: ${trackId}`);
          console.log('row:', row);
        }

        // 添加到歌单
        await addTrackToPlaylist(db, playlistId, trackId);
        return trackId;
      } catch (error) {
        console.error('Error in add-track-to-playlist:', error);
        throw error;
      }
    },
  );

  // 从歌单中删除音乐事件
  ipcMain.handle(
    'remove-track-from-playlist',
    async (event: IpcMainInvokeEvent, playlistId: number, trackId: number) => {
      try {
        await removeTrackFromPlaylist(db, playlistId, trackId);
      } catch (error) {
        console.error('Error in remove-track-from-playlist:', error);
        throw error;
      }
    },
  );

  ipcMain.handle('get-user-data-path', async (event: IpcMainInvokeEvent) => {
    return dataPath;
  });

  // 监听播放器状态请求
  ipcMain.once('reply-player-state', (event: IpcMainEvent, state: any) => {
    console.log('主进程已收到播放器状态:', state);
    savePlayer(playerStateDumpFile, state);
    app.quit();
  });

  // 修改歌单事件
  ipcMain.handle(
    'modify-playlist',
    async (
      event: IpcMainInvokeEvent,
      playlistId: number,
      playlist_title: string,
      playlist_description: string,
    ) => {
      try {
        // 修改歌单信息
        await modifyPlaylist(db, playlistId, playlist_title, playlist_description);
        return true;
      } catch (error) {
        console.error('Error in modify-playlist:', error);
        throw error;
      }
    },
  );

  // 删除歌单事件
  ipcMain.handle('remove-playlist', async (event: IpcMainInvokeEvent, playlistId: number) => {
    try {
      await removePlaylist(db, playlistId);
      return true;
    } catch (error) {
      console.error('Error in remove-playlist:', error);
      throw error;
    }
  });

  ipcMain.handle('get-config', (event: IpcMainInvokeEvent, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('set-config', (event: IpcMainInvokeEvent, key: string, value: any) => {
    store.set(key, value);
    return true;
  });
}