// file: src/main/ipc.ts
import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import PlaylistService from '@main/services/playlistService';
import { loadPlayer, savePlayer } from '@main/services/playerService';
import { dataPath, dbPath, music_Dir, playerStateDumpFile } from './pathConfig';
import { container } from '@main/di/di-container';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { Platform } from '@main/enum/Platform';
import Store from 'electron-store';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';
import { FileCacheManager } from '@main/FileCacheManager';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { WindowKey, WindowManager } from '@main/window/windowManager';
import { HifiniDownloader } from '@main/services/Downloader';
import * as os from 'node:os';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs';
import { TYPES } from '@main/di/symbol';

const hifiniMusic: HifiniMusic = container.get(TYPES.HifiniMusic);
const playlistService: PlaylistService = container.get(TYPES.PlaylistService);
const store: Store = container.get(TYPES.Store);
const trackService: TrackService = container.get(TYPES.TrackService);
const netEaseCloudMusic: NetEaseCloudMusic = container.get(TYPES.NetEaseCloudMusic);
const qqMusic: QQMusic = container.get(TYPES.QQMusic);
const lyricService: LyricService = container.get(TYPES.LyricService);
const fileCacheManager: FileCacheManager = container.get<FileCacheManager>(TYPES.FileCacheManager);
const downloader: HifiniDownloader = container.get<HifiniDownloader>(TYPES.HifiniDownloader);
const windowManager: WindowManager = container.get<WindowManager>(TYPES.WindowManager);

export function setupIpcHandlers(mainWindow: BrowserWindow): void {


  ipcMain.handle('get-systemContext', async () => {
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
  ipcMain.handle('add-track-to-libraryContext', async (_event: IpcMainInvokeEvent, track: TrackEntity) => {
    return await trackService.addTrackToLibrary(track);
  });

  // 添加音乐到歌单事件
  ipcMain.handle(
    'add-track-to-playlist', async (_event: IpcMainInvokeEvent, track: TrackEntity, playlistId: number) => {
      console.dir(track, { depth: null });
      return await playlistService.addTrackToPlaylist(playlistId, track);
    },
  );

  // 从歌单中删除音乐事件
  ipcMain.handle(
    'remove-track-from-playlistContext',
    async (_event: IpcMainInvokeEvent, playlistId: number, track: TrackEntity) => {
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
      playlistModel: PlaylistEntity,
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


  ipcMain.handle('remove-track-from-libraryContext', async (_event: IpcMainInvokeEvent, track: TrackEntity) => {
    return await trackService.removeTrackFromLibrary(track);
  });


  ipcMain.handle('get-netease-cloud-music-playlistContext-detail', async (_event: IpcMainInvokeEvent, playlist_id: string) => {
    return await netEaseCloudMusic.getPlaylistDetail(playlist_id);
  });

  ipcMain.handle('add-playlistContext', async (_event: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
    return await playlistService.addPlaylist(playlist);
  });

  ipcMain.handle('get-lyrics', async (_event: IpcMainInvokeEvent, track_model: TrackEntity) => {

    console.log('IPC: 获取歌词:', track_model);
    console.log(track_model.constructor.name);
    return await lyricService.getLyrics(track_model);

  });


  ipcMain.on('reveal-database-in-file-system', async () => {
    const { shell } = require('electron');
    shell.showItemInFolder(dbPath);
  });

  ipcMain.handle('calculate-file-cache-disk-usage', async () => {
    return await fileCacheManager.getDiskUsage();
  });


  ipcMain.on('down-from-hifini', async (_e, track: TrackEntity) => {
    const [rawLink] = await downloader.getLanzouDirectLink(track.platform_unique_id);
    if (!rawLink) return;

    const token = crypto.randomUUID();
    downloader.registerDownload(token, track.id);        // 1) 只记住 trackId

    // 2) 用 once 将 token 绑定到接下来的 DownloadItem
    const ses = windowManager.get(WindowKey.WORKER)!.webContents.session;
    ses.once('will-download', (event, item) => {
      const fileName = item.getFilename();
      const total = item.getTotalBytes();
      const savePath = path.join(os.tmpdir(), fileName); // 先写临时目录

      item.setSavePath(savePath);
      downloader.fillMeta(token, fileName, total, savePath); // 2.1) 补全注册表

      /** 进度 → 可以发给渲染进程 **/
      item.on('updated', (_e, state) => {
        if (state === 'progressing') {
          const received = item.getReceivedBytes();
          // mainWindow.webContents.send('download-progress', { token, received, total })
        }
      });

      /** 下载完成 **/
      item.once('done', async (_e, state) => {
        if (state !== 'completed') {
          console.error(chalk.red(`[下载失败] ${fileName}`));
          downloader.delete(token);
          return;
        }

        console.log(chalk.green(`[下载完成] ${fileName}`));

        let finalFlac = '';
        try {
          if (fileName.toLowerCase().endsWith('.zip')) {
            // 3) 解压首个 .flac 并返回文件名
            finalFlac = await downloader.extractFlacFile(savePath, music_Dir);
          } else if (fileName.toLowerCase().endsWith('.flac')) {
            // 3’) 直接是 flac，则拷贝
            finalFlac = fileName;
            const dest = path.join(music_Dir, finalFlac);
            fs.copyFileSync(savePath, dest);
            console.log(chalk.green(`[FLAC 拷贝完成] → ${dest}`));
          } else {
            console.warn('未知格式，忽略');
          }

          console.log(`正在绑定数据库:track:${track} - ${finalFlac}`);

          // 4) 绑定数据库 
          await trackService.bindLocalTrackFile(track.id, finalFlac);

          console.log(chalk.green(`[数据库绑定完成] ${track.id} → ${finalFlac}`));

          // 5) 通知渲染端
          // mainWindow.webContents.send('download-done', { token, flac: finalFlac });

        } catch (err) {
          console.error(chalk.red('后处理失败:'), err);
          // mainWindow.webContents.send('download-failed', { token, err: err.message });
        } finally {
          downloader.delete(token);               // 清理注册表
          fs.unlink(savePath, () => {
          });          // 可选：删临时包
        }
      });
    });

    // 6) 真正触发下载（不用 token 拼 URL，重定向也不丢）
    ses.downloadURL(rawLink);
  });
}