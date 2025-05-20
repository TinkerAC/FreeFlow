import { app, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { inject, injectable } from 'inversify';
import PlaylistService from '@main/services/playlistService';
import { loadPlayer, savePlayer } from '@main/services/playerService';

import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { Platform } from '@main/core/enum/Platform';
import Store from 'electron-store';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { LyricService } from '@main/services/LyricService';
import { FileCacheManager } from '@main/core/FileCacheManager';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { WindowKey, WindowManager } from '@main/window/windowManager';
import { HifiniDownloader } from '@main/services/Downloader';
import * as os from 'node:os';
import path from 'path';
import chalk from 'chalk';
import fs from 'fs';
import crypto from 'node:crypto';
import { DISymbol } from '@main/di/symbol';
import { PreferenceService } from '@main/services/PreferenceService';
import { AppIcon } from '@src/shared/hifiniCookies';
import { dataPath, dbPath, music_Dir, playerStateDumpFile } from '@main/core/pathConfig';

/**
 * IpcController 统一注册所有 IPC 事件，并按功能切分成若干私有注册方法，
 * 便于后续维护与单元测试。
 */
@injectable()
export default class IpcController {
  constructor(
    @inject(DISymbol.HifiniMusic) private readonly hifiniMusic: HifiniMusic,
    @inject(DISymbol.PlaylistService) private readonly playlistService: PlaylistService,
    @inject(DISymbol.Store) private readonly store: Store,
    @inject(DISymbol.TrackService) private readonly trackService: TrackService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netEaseCloudMusic: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qqMusic: QQMusic,
    @inject(DISymbol.LyricService) private readonly lyricService: LyricService,
    @inject(DISymbol.FileCacheManager) private readonly fileCacheManager: FileCacheManager,
    @inject(DISymbol.HifiniDownloader) private readonly downloader: HifiniDownloader,
    @inject(DISymbol.WindowManager) private readonly windowManager: WindowManager,
    @inject(DISymbol.PreferenceService) private readonly preferenceService: PreferenceService,
  ) {
  }

  /**
   * 调用一次即可完成所有 IPC 处理器的注册。
   */
  public register(): void {
    this.registerSystemHandlers();
    this.registerWindowHandlers();
    this.registerPlaylistHandlers();
    this.registerPlayerHandlers();
    this.registerTrackHandlers();
    this.registerSearchHandlers();
    this.registerConfigHandlers();
    this.registerDownloadHandlers();
    this.registerMiscHandlers();
  }

  /* -------------------------- 系统相关 --------------------------- */
  private registerSystemHandlers(): void {
    ipcMain.handle('get-systemContext', async () => process.platform);
  }

  /* -------------------------- 窗口相关 --------------------------- */
  private registerWindowHandlers(): void {
    const mainWindow = this.windowManager.get(WindowKey.MAIN)!;
    ipcMain.on('window-controls', (_evt: IpcMainEvent, action: string) => {
      switch (action) {
        case 'minimize':
          mainWindow.minimize();
          break;
        case 'maximize':
          mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
          break;
        case 'close':
          mainWindow.hide();
          break;
        case 'open-preference-window':
          this.windowManager.show(WindowKey.Preference);
          break;
        default:
          console.error('Unknown window action:', action);
      }
    });
  }

  /* -------------------------- 歌单相关 --------------------------- */
  private registerPlaylistHandlers(): void {
    ipcMain.handle('create-playlists', async () => {
      return await this.playlistService.creatNewEmptyPlaylist();
    });

    ipcMain.handle('get-playlists', async () => {
      return await this.playlistService.getPlaylists();
    });

    ipcMain.handle(
      'add-track-to-playlist',
      async (_evt: IpcMainInvokeEvent, track: TrackEntity, playlistId: number) => {
        console.dir(track, { depth: null });
        return await this.playlistService.addTrackToPlaylist(playlistId, track);
      },
    );

    ipcMain.handle(
      'remove-track-from-playlistContext',
      async (_evt: IpcMainInvokeEvent, playlistId: number, track: TrackEntity) => {
        return await this.playlistService.removeTrackFromPlaylist(playlistId, track);
      },
    );

    ipcMain.handle(
      'modify-playlistContext',
      async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
        return await this.playlistService.modifyPlaylist(playlist);
      },
    );

    ipcMain.handle('remove-playlistContext', async (_evt: IpcMainInvokeEvent, playlistId: number) => {
      return await this.playlistService.removePlaylist(playlistId);
    });

    ipcMain.handle('add-playlistContext', async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
      return await this.playlistService.addPlaylist(playlist);
    });
  }

  /* -------------------------- 播放器相关 --------------------------- */
  private registerPlayerHandlers(): void {
    const mainWindow = this.windowManager.get(WindowKey.MAIN);
    ipcMain.handle('load-player-state', async () => loadPlayer(playerStateDumpFile));
    // 渲染进程回复的播放器状态，保存后退出应用
    ipcMain.once('reply-player-state', (_evt: IpcMainEvent, state: PlayerState) => {
      console.log('主进程已收到播放器状态:', state);
      savePlayer(playerStateDumpFile, state);
      mainWindow && mainWindow.destroy();
      // 结束整个应用
      app.quit();
    });
  }

  /* -------------------------- 曲目相关 --------------------------- */
  private registerTrackHandlers(): void {
    ipcMain.handle(
      'get-track-info',
      async (_evt: IpcMainInvokeEvent, platform: Platform, platform_unique_id: string) => {
        return await this.trackService.getTrackInfo(platform, platform_unique_id);
      },
    );

    ipcMain.handle(
      'add-track-to-libraryContext',
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.addTrackToLibrary(track);
      },
    );

    ipcMain.handle(
      'remove-track-from-libraryContext',
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.removeTrackFromLibrary(track);
      },
    );

    ipcMain.handle('get-lyrics', async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      console.log('IPC: 获取歌词:', track);
      return await this.lyricService.getLyrics(track);
    });
  }

  /* -------------------------- 搜索相关 --------------------------- */
  private registerSearchHandlers(): void {
    ipcMain.handle('get-search-result', async (_evt, keywords: string) => {
      console.log('后端收到搜索请求:', keywords);
      const [hifini, neteaseTracks, neteasePlaylists, qqTracks] = await Promise.all([
        this.hifiniMusic.searchTracks(keywords),
        this.netEaseCloudMusic.searchTracks(keywords),
        this.netEaseCloudMusic.cloudSearchPlaylist(keywords),
        this.qqMusic.searchTracks(keywords),
      ]);

      return {
        tracks: [...hifini, ...neteaseTracks, ...qqTracks],
        playlists: neteasePlaylists,
      };
    });

    ipcMain.handle(
      'get-netease-cloud-music-playlistContext-detail',
      async (_evt: IpcMainInvokeEvent, playlistId: string) => {
        return await this.netEaseCloudMusic.getPlaylistDetail(playlistId);
      },
    );
  }

  /* -------------------------- 设置 & 配置 --------------------------- */
  private registerConfigHandlers(): void {
    ipcMain.handle('get-configContext', (_evt: IpcMainInvokeEvent, key: string) => {
      return this.store.get(key);
    });

    ipcMain.handle('set-configContext', (_evt: IpcMainInvokeEvent, key: string, value: unknown) => {
      this.store.set(key, value);
      return true;
    });

    ipcMain.on('set-appIcon', async (_evt, appIcon: AppIcon) => {
      await this.preferenceService.setAppIcon(appIcon);
    });
  }

  /* -------------------------- 下载相关 --------------------------- */
  private registerDownloadHandlers(): void {
    ipcMain.handle('calculate-file-cache-disk-usage', async () => {
      return await this.fileCacheManager.getDiskUsage();
    });

    ipcMain.on('down-from-hifini', async (_evt, track: TrackEntity) => {
      const [rawLink] = await this.downloader.getLanzouDirectLink(track.platform_unique_id);
      if (!rawLink) return;

      const token = crypto.randomUUID();
      this.downloader.registerDownload(token, track.id);

      const ses = this.windowManager.get(WindowKey.WORKER)!.webContents.session;
      ses.once('will-download', (event, item) => {
        const fileName = item.getFilename();
        const total = item.getTotalBytes();
        const savePath = path.join(os.tmpdir(), fileName);

        item.setSavePath(savePath);
        this.downloader.fillMeta(token, fileName, total, savePath);

        item.on('updated', (_e, state) => {
          if (state === 'progressing') {
            const received = item.getReceivedBytes();
            // TODO: 若需要进度通知，可在此发送给渲染进程
            // mainWindow.webContents.send('download-progress', { token, received, total });
          }
        });

        item.once('done', async (_e, state) => {
          if (state !== 'completed') {
            console.error(chalk.red(`[下载失败] ${fileName}`));
            this.downloader.delete(token);
            return;
          }

          console.log(chalk.green(`[下载完成] ${fileName}`));

          let finalFlac = '';
          try {
            if (fileName.toLowerCase().endsWith('.zip')) {
              finalFlac = await this.downloader.extractFlacFile(savePath, music_Dir);
            } else if (fileName.toLowerCase().endsWith('.flac')) {
              finalFlac = fileName;
              const dest = path.join(music_Dir, finalFlac);
              fs.copyFileSync(savePath, dest);
              console.log(chalk.green(`[FLAC 拷贝完成] → ${dest}`));
            } else {
              console.warn('未知格式，忽略');
            }

            await this.trackService.bindLocalTrackFile(track.id, finalFlac);
            console.log(chalk.green(`[数据库绑定完成] ${track.id} → ${finalFlac}`));
          } catch (err) {
            console.error(chalk.red('后处理失败:'), err);
          } finally {
            this.downloader.delete(token);
            fs.unlink(savePath, () => void 0);
          }
        });
      });

      ses.downloadURL(rawLink);
    });
  }

  /* -------------------------- 其他杂项 --------------------------- */
  private registerMiscHandlers(): void {
    ipcMain.handle('get-user-data-path', async () => dataPath);

    ipcMain.on('reveal-database-in-file-system', async () => {
      const { shell } = require('electron');
      shell.showItemInFolder(dbPath);
    });
  }
}
