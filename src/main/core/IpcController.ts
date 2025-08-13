import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { inject, injectable } from 'inversify';
import PlaylistService from '@main/services/PlaylistService';
import { loadPlayer, savePlayer } from '@main/services/PlayerService';

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
import { DataPath } from '@main/core/PathConfig';
import { getOperatingSystem } from '@src/utils/helpers';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { ConfigService } from '@main/core/configService';
import { Settings } from '@src/shared/settings/schema';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { NotImplementedError } from '@main/core/exceptions/NotImplementedError';

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
    @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
    @inject(DISymbol.TrackService) private readonly trackService: TrackService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netEaseCloudMusic: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qqMusic: QQMusic,
    @inject(DISymbol.LyricService) private readonly lyricService: LyricService,
    @inject(DISymbol.FileCacheManager) private readonly fileCacheManager: FileCacheManager,
    @inject(DISymbol.HifiniDownloader) private readonly downloader: HifiniDownloader,
    @inject(DISymbol.WindowManager) private readonly windowManager: WindowManager,
    @inject(DISymbol.PreferenceService) private readonly preferenceService: PreferenceService,
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
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
    this.registerConfigV2Handlers();
    this.registerDownloadHandlers();
    this.registerMiscHandlers();
  }

  /* -------------------------- 系统相关 --------------------------- */
  private registerSystemHandlers(): void {
    ipcMain.handle('get-system', async () => getOperatingSystem());

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('get-app-author', () => {
      return 'Tinker';
    });
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
    ipcMain.handle('create-playlist', async () => {
      return await this.playlistService.creatNewEmptyPlaylist();
    });

    ipcMain.handle('get-playlist', async () => {
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
      'remove-track-from-playlist',
      async (_evt: IpcMainInvokeEvent, playlistId: number, track: TrackEntity) => {
        return await this.playlistService.removeTrackFromPlaylist(playlistId, track);
      },
    );

    ipcMain.handle(
      'modify-playlist',
      async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
        return await this.playlistService.modifyPlaylist(playlist);
      },
    );

    ipcMain.handle('remove-playlist', async (_evt: IpcMainInvokeEvent, playlistId: number) => {
      return await this.playlistService.removePlaylist(playlistId);
    });

    ipcMain.handle('add-playlist', async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
      return await this.playlistService.addPlaylist(playlist);
    });
  }

  /* -------------------------- 播放器相关 --------------------------- */
  private registerPlayerHandlers(): void {
    const mainWindow = this.windowManager.get(WindowKey.MAIN);
    ipcMain.handle('load-player-state', async () => loadPlayer(this.dataPath.playerStateDumpFile));
    // 渲染进程回复的播放器状态，保存后退出应用
    ipcMain.once('reply-player-state', (_evt: IpcMainEvent, state: PlayerState) => {
      console.log('主进程已收到播放器状态:', state);
      savePlayer(this.dataPath.playerStateDumpFile, state);
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
      'add-track-to-library',
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.addTrackToLibrary(track);
      },
    );

    ipcMain.handle(
      'remove-track-from-library',
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.removeTrackFromLibrary(track);
      },
    );

    ipcMain.handle('get-lyrics', async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      console.log('IPC: 获取歌词:', track);
      return await this.lyricService.getLyrics(track);
    });


    ipcMain.on('increase-play-count', async (_evt: IpcMainEvent, track: TrackEntity) => {
      console.log('IPC: 增加播放次数:', track);
      try {
        await this.trackService.increasePlayCount(track);
      } catch (error) {
        console.error('增加播放次数失败:', error);
      }
    });
  }

  /* -------------------------- 搜索相关 --------------------------- */
  private registerSearchHandlers(): void {
    /** —— 工具函数 —— */

      // 安全 Promise：失败就返回 fallback，并打日志
    const safe = async <T>(p: Promise<T>, label: string, fallback: T): Promise<T> => {
        try {
          return await p;
        } catch (e) {
          console.error(`[search:${label}] failed:`, e);
          return fallback;
        }
      };

    // 封面 URL 统一 https / 支持 //schema
    const httpsify = (u?: string) => {
      if (!u) return '';
      if (u.startsWith('//')) return `https:${u}`;
      return u.replace(/^http:\/\//i, 'https://');
    };

    // —— 类型守卫：曲目/歌单 粗粒度判断（避免歌单混入歌曲列表）——
    const isTrackLike = (x: any): x is TrackEntity =>
      !!x &&
      typeof x === 'object' &&
      typeof x.title === 'string' &&
      typeof x.platform_unique_id === 'string' &&
      !('playlist_id' in x) &&
      !Array.isArray((x as any).tracks);

    const isPlaylistLike = (x: any): x is PlaylistEntity =>
      !!x &&
      typeof x === 'object' &&
      (
        'playlist_id' in x ||
        Array.isArray((x as any).tracks) ||
        (typeof (x as any).title === 'string' && 'creator' in x)
      );

    // —— 曲目清洗：字段兜底、封面 https、清理奇怪的 artist 值 ——
    const sanitizeTrack = (t: any): TrackEntity | null => {
      if (!isTrackLike(t)) return null;

      const artist = String(t.artist ?? '');

      const out: TrackEntity = {
        platform: t.platform,
        platform_unique_id: String(t.platform_unique_id ?? ''),
        title: String(t.title ?? ''),
        artist,
        album: String(t.album ?? ''),
        duration: Number(t.duration ?? 0) || 0,
        cover_src: httpsify(t.cover_src) || '',
        created_at: t.created_at ? new Date(t.created_at) : new Date(),
        // fee 字段已移除/可选时不再写入
      };

      if (!out.title || !out.platform_unique_id) return null;
      return out;
    };

    // —— 曲目去重：以 platform + unique_id 作为键 ——
    const dedupeTracks = (arr: TrackEntity[]) => {
      const seen = new Set<string>();
      const out: TrackEntity[] = [];
      for (const t of arr) {
        const key = `${t.platform}:${t.platform_unique_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(t);
        }
      }
      return out;
    };

    // —— 歌单去重：优先 platform+playlist_id，缺失则退化到 title+creator ——
    const dedupePlaylists = (arr: PlaylistEntity[]) => {
      const seen = new Set<string>();
      const out: PlaylistEntity[] = [];
      for (const p of arr) {
        const platform = (p as any).platform ?? 'unknown';
        const pid = (p as any).playlist_id ?? (p as any).id ?? '';
        const fallback = `${(p as any).title ?? ''}|${(p as any).creator ?? ''}`;
        const key = pid ? `${platform}:${pid}` : `${platform}:${fallback}`;
        if (!seen.has(key)) {
          seen.add(key);
          // 如需：https 化封面，可在此统一处理 e.g. p.cover_src = httpsify((p as any).cover_src)
          out.push(p);
        }
      }
      return out;
    };

    /** —— IPC handlers —— */

    ipcMain.handle('get-search-result', async (_evt: IpcMainInvokeEvent, keywords: string) => {
      console.log('后端收到搜索请求:', keywords);

      const EMPTY: FusionSearchResult = { track_result: [], playlist_result: [] };

      // 统一走各平台的 search(keywords) → FusionSearchResult
      const neteaseP = this.netEaseCloudMusic?.search
        ? safe(this.netEaseCloudMusic.search(keywords), 'netease.search', EMPTY)
        : Promise.resolve(EMPTY);

      const qqP = this.qqMusic?.search
        ? safe(this.qqMusic.search(keywords), 'qq.search', EMPTY)
        : Promise.resolve(EMPTY);

      const bilibiliP = this.bilibili?.search
        ? safe(this.bilibili.search(keywords), 'bilibili.search', EMPTY)
        : Promise.resolve(EMPTY);


      // 拉齐所有平台结果
      const results = await Promise.all([neteaseP, qqP, bilibiliP]);

      // 堆叠全结果
      const allTracksRaw = results.flatMap(r => r?.track_result ?? []);
      const allPlRaw = results.flatMap(r => r?.playlist_result ?? []);

      // 清洗 + 去重
      const track_result = dedupeTracks(
        allTracksRaw
          .filter(isTrackLike)
          .map(sanitizeTrack)
          .filter(Boolean) as TrackEntity[],
      );

      const playlist_result = dedupePlaylists(
        allPlRaw.filter(isPlaylistLike),
      );

      const fusion: FusionSearchResult = { track_result, playlist_result };
      return fusion;
    });

    ipcMain.handle('local-search', async (_evt: IpcMainInvokeEvent, keywords: string) => {
      console.log('后端收到本地搜索请求:', keywords);
      return await this.trackService.localSearch(keywords);
    });


    ipcMain.handle('get-playlist-detail', async (_evt: IpcMainInvokeEvent, platform: string, platform_unique_id: string) => {
      console.log('后端收到获取歌单详情请求:', platform, platform_unique_id);
      switch (platform) {
        case Platform.NET_EASE_CLOUD_MUSIC:
          return await this.netEaseCloudMusic.getFullPlaylist(platform_unique_id);
        case Platform.QQ_MUSIC:
          throw NotImplementedError;
        case Platform.BILIBILI:
          throw NotImplementedError;
        default:
          throw new Error(`不支持的平台: ${platform}`);
      }
    });
  }

  /* -------------------------- 设置 & 配置 --------------------------- */
  private registerConfigHandlers(): void {
    ipcMain.handle('get-config', (_evt, key: string) => {
      // 支持 "theme.mode" 这类 path
      return this.configService.get(key);
    });

    ipcMain.handle('set-config', (_evt, key: string, value: unknown) => {
      this.configService.set(key, value);
      // 可选：广播变更给所有窗口
      BrowserWindow.getAllWindows().forEach(w =>
        w.webContents.send('config:changed', key, value),
      );
      return true;
    });

    ipcMain.on('set-appIcon', async (_evt, appIcon: AppIcon) => {
      await this.preferenceService.setAppIcon(appIcon);
    });
  }

  /** 新接口（Settings 全量/分支/patch） */
  private registerConfigV2Handlers() {
    ipcMain.handle('config:getAll', async () => {
      return await this.configService.getAll();
    });

    ipcMain.handle('config:get', async (_evt, key: string) => {
      return await this.configService.get(key);
    });

    ipcMain.handle('config:set', async (_evt, payload: { key: string; value: any }) => {
      const next = await this.configService.set(payload.key, payload.value);
      // this.broadcastConfigChanged(next);
    });

    ipcMain.handle('config:setByPath', async (_evt, payload: { path: string; value: any }) => {
      const next = await this.configService.setByPath(payload.path, payload.value);
      // this.broadcastConfigChanged(next);
    });

    ipcMain.handle('config:patch', async (_evt, partial: Partial<Settings>) => {
      const next = await this.configService.patch(partial);
      // this.broadcastConfigChanged(next);
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
              finalFlac = await this.downloader.extractFlacFile(savePath, this.dataPath.musicDir);
            } else if (fileName.toLowerCase().endsWith('.flac')) {
              finalFlac = fileName;
              const dest = path.join(this.dataPath.musicDir, finalFlac);
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
    ipcMain.handle('get-user-data-path', async () => this.dataPath.dbPath);

    ipcMain.on('reveal-database-in-file-system', async () => {
      const { shell } = require('electron');
      shell.showItemInFolder(this.dataPath.dbPath);
    });
  }


}
