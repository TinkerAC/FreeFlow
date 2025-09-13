import { app, BrowserWindow, ipcMain, IpcMainEvent, IpcMainInvokeEvent, screen } from 'electron';
import { inject, injectable } from 'inversify';
import PlaylistService from '@main/services/PlaylistService';
import { loadPlayer, savePlayer } from '@main/services/PlayerService';

import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import TrackService from '@main/services/TrackService';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { Platform } from '@main/core/enum/Platform';
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
import { DataPath } from '@main/core/PathConfig';
import { getOperatingSystem } from '@src/utils/helpers';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { ConfigService } from '@main/core/configService';
import { Settings } from '@src/shared/settings/schema';
import { PreferenceService } from '@main/services/PreferenceService';
import { AppIcon } from '@src/shared/hifiniCookies';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { NotImplementedError } from '@main/core/exceptions/NotImplementedError';
import { Channels } from '@src/shared/ipc/channels';
import { AiTextService } from '@main/services/ai/AiTextService';

/**
 * IpcController 统一注册所有 IPC 事件，并按功能切分成若干私有注册方法，
 * 便于后续维护与单元测试。
 */
@injectable()
export default class IpcController {
  // 跟踪已绑定事件的 Mini 窗口，避免重复绑定
  private miniBoundSet = new WeakSet<BrowserWindow>();
  // 记录最近一次应用的图标，避免无关配置变更触发重复覆盖图标
  private lastAppliedIcon: AppIcon | null = null;
  constructor(
    @inject(DISymbol.HifiniMusic) private readonly hifiniMusic: HifiniMusic,
    @inject(DISymbol.PlaylistService) private readonly playlistService: PlaylistService,
    @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
    @inject(DISymbol.TrackService) private readonly trackService: TrackService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netEaseCloudMusic: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qqMusic: QQMusic,
    @inject(DISymbol.LyricService) private readonly lyricService: LyricService,
    @inject(DISymbol.FileCacheManager) private readonly fileCacheManager: FileCacheManager,
    @inject(DISymbol.HifiniDownloader) private readonly downloader: HifiniDownloader,
    @inject(DISymbol.WindowManager) private readonly windowManager: WindowManager,
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
    @inject(DISymbol.PreferenceService) private readonly preferenceService: PreferenceService,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
    @inject(DISymbol.AiTextService) private readonly aiText: AiTextService,
  ) {
  }

  // 缓存最近一次播放器状态，便于新窗口（如 Mini）快速首屏展示
  private lastPlayerState: PlayerState | null = null;

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
    this.registerConfigV2Handlers();
    this.registerDownloadHandlers();
    this.registerMiscHandlers();

    // 初始化：记录当前图标，避免第一次“任意设置变更”就触发图标重设
    try {
      this.lastAppliedIcon = this.preferenceService.getCurrentIcon();
    } catch { /* ignore */ }

    // 监听设置变化以应用 App 图标（仅在 icon 变更时执行）
    this.configService.onChanged((s) => {
      const icon = (s as any)?.app?.icon as AppIcon | undefined;
      if (!icon) return;
      if (this.lastAppliedIcon === icon) return; // 无变化，跳过
      this.lastAppliedIcon = icon;
      this.preferenceService.applyIcon(icon).catch((_e: unknown): void => { /* noop */ });
    });
  }

  /* -------------------------- 系统相关 --------------------------- */
  private registerSystemHandlers(): void {
    ipcMain.handle(Channels.System.GetPlatform, async () => getOperatingSystem());

    ipcMain.handle(Channels.System.GetAppVersion, () => {
      return app.getVersion();
    });

    ipcMain.handle(Channels.System.GetAppAuthor, () => {
      return 'Tinker';
    });
  }


  /* -------------------------- 窗口相关 --------------------------- */
  private registerWindowHandlers(): void {
    const mainWindow = this.windowManager.get(WindowKey.MAIN)!;
    ipcMain.on(Channels.Window.Controls, (_evt: IpcMainEvent, action: string) => {
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
        default:
          console.error('Unknown window action:', action);
      }
    });

    // 迷你播放器窗口控制
    ipcMain.handle(Channels.MiniPlayer.Toggle, async () => {
      if (this.windowManager.isVisible(WindowKey.MINI)) {
        this.windowManager.activate(WindowKey.MAIN);
      } else {
        const mini = this.windowManager.ensure(WindowKey.MINI);
        // 调试日志已禁用
        this.applyMiniPlayerBounds(mini);
        this.attachMiniPlayerPersistence(mini);
        this.windowManager.showExclusive(WindowKey.MINI, true);
        // 切到 Mini 后，请在 Mini 页面加载完成后再请求一次状态，避免竞态导致 Mini 丢失首帧状态
        const main = this.windowManager.get(WindowKey.MAIN);
        const ask = () => main?.webContents.send(Channels.Player.RequestState);
        const wc = mini.webContents;
        if (wc.isLoadingMainFrame()) wc.once('did-finish-load', ask); else setTimeout(ask, 0);
      }
    });
    ipcMain.handle(Channels.MiniPlayer.Show, async () => {
      const mini = this.windowManager.ensure(WindowKey.MINI);
      this.applyMiniPlayerBounds(mini);
      this.attachMiniPlayerPersistence(mini);
      this.windowManager.showExclusive(WindowKey.MINI, true);
      // 显示 Mini 时立即触发一次状态同步
      const main = this.windowManager.get(WindowKey.MAIN);
      if (main) {
        const ask = () => main.webContents.send(Channels.Player.RequestState);
        const wc = mini.webContents;
        if (wc.isLoadingMainFrame()) wc.once('did-finish-load', ask); else setTimeout(ask, 0);
      }
    });
    ipcMain.handle(Channels.MiniPlayer.Hide, async () => {
      this.windowManager.hide(WindowKey.MINI);
      this.windowManager.activate(WindowKey.MAIN);
    });

    // 固定高度展开/收起歌词：通过调整窗口高度实现
    ipcMain.handle(Channels.MiniPlayer.SetExpanded, async (_evt, payload: { expanded: boolean }) => {
      if (!payload || typeof payload.expanded !== 'boolean') {
        console.warn('[mini-player:set-expanded] invalid payload');
        return;
      }
      const mini = this.windowManager.ensure(WindowKey.MINI);
      const [w] = mini.getSize();
      const collapsedH = 100; // 与窗口默认高度保持一致
      const expandedH = collapsedH + 120;  // 展开后固定高度（歌词区约 +120）
      mini.setSize(w, payload?.expanded ? expandedH : collapsedH, true);
    });
  }

  /** 将上次保存的迷你播放器窗口位置/大小应用到窗口上 */
  private applyMiniPlayerBounds(mini: BrowserWindow): void {
    try {
      const saved = this.configService.get('ui.miniPlayer');
      if (!saved) return;
      const { x, y, width, height } = saved as { x?: number; y?: number; width?: number; height?: number };
      const next: Electron.Rectangle = {
        x: typeof x === 'number' ? x : mini.getBounds().x,
        y: typeof y === 'number' ? y : mini.getBounds().y,
        width: typeof width === 'number' ? Math.max(mini.getMinimumSize()[0], width) : mini.getBounds().width,
        height: typeof height === 'number' ? Math.max(mini.getMinimumSize()[1], height) : mini.getBounds().height,
      };

      // 保证在任意显示器可见区域内
      const display = screen.getDisplayMatching(next);
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
      // 若超出则夹取到工作区内
      next.x = Math.max(dx, Math.min(next.x, dx + dw - 50));
      next.y = Math.max(dy, Math.min(next.y, dy + dh - 50));
      next.width = Math.min(next.width, dw);
      next.height = Math.min(next.height, dh);

      mini.setBounds(next, false);
    } catch (e) {
      console.warn('应用 MiniPlayer 窗口位置/大小失败:', e);
    }
  }

  /** 绑定 MiniPlayer 窗口的位置/大小持久化 */
  private attachMiniPlayerPersistence(mini: BrowserWindow): void {
    if (this.miniBoundSet.has(mini)) return;
    this.miniBoundSet.add(mini);

    // 简单防抖，避免频繁写入配置（导致无关 onChanged 回调触发）
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const b = mini.getBounds();
          this.configService.setByPath('ui.miniPlayer', { x: b.x, y: b.y, width: b.width, height: b.height });
        } catch (e) {
          console.warn('保存 MiniPlayer 窗口位置/大小失败:', e);
        }
      }, 150);
    };

    mini.on('move', save);
    mini.on('resize', save);
    mini.on('close', save);
  }


  /* -------------------------- 歌单相关 --------------------------- */
  private registerPlaylistHandlers(): void {
    ipcMain.handle(Channels.Playlist.Create, async () => {
      return await this.playlistService.creatNewEmptyPlaylist();
    });

    ipcMain.handle(Channels.Playlist.GetAll, async () => {
      return await this.playlistService.getPlaylists();
    });

    ipcMain.handle(
      Channels.Playlist.AddTrack,
      async (_evt: IpcMainInvokeEvent, track: TrackEntity, playlistId: number) => {
        console.dir(track, { depth: null });
        return await this.playlistService.addTrackToPlaylist(playlistId, track);
      },
    );

    ipcMain.handle(
      Channels.Playlist.RemoveTrack,
      async (_evt: IpcMainInvokeEvent, playlistId: number, track: TrackEntity) => {
        return await this.playlistService.removeTrackFromPlaylist(playlistId, track);
      },
    );

    ipcMain.handle(
      Channels.Playlist.Modify,
      async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
        return await this.playlistService.modifyPlaylist(playlist);
      },
    );

    ipcMain.handle(Channels.Playlist.Remove, async (_evt: IpcMainInvokeEvent, playlistId: number) => {
      return await this.playlistService.removePlaylist(playlistId);
    });

    ipcMain.handle(Channels.Playlist.Add, async (_evt: IpcMainInvokeEvent, playlist: PlaylistEntity) => {
      return await this.playlistService.addPlaylist(playlist);
    });
  }

  /* -------------------------- 播放器相关 --------------------------- */
  private registerPlayerHandlers(): void {
    const mainWindow = this.windowManager.get(WindowKey.MAIN);
    ipcMain.handle(Channels.Player.LoadState, async () => loadPlayer(this.dataPath.playerStateDumpFile));
    // 渲染进程回复的播放器状态，保存后退出应用
    ipcMain.once(Channels.Player.ReplyState, (_evt: IpcMainEvent, state: PlayerState) => {
      console.log('主进程已收到播放器状态:', state);
      savePlayer(this.dataPath.playerStateDumpFile, state);
      mainWindow && mainWindow.destroy();
      // 结束整个应用
      app.quit();
    });

    // Single-owner: proxy player controls to MAIN renderer
    ipcMain.on(Channels.Player.Control, (evt, cmd: string, payload: any) => {
      const allowed = new Set(['play', 'pause', 'toggle', 'next', 'prev', 'seek', 'setVolume']);
      if (!allowed.has(String(cmd))) {
        console.warn('[player:control] invalid cmd:', cmd);
        return;
      }
      const main = this.windowManager.get(WindowKey.MAIN);
      main?.webContents.send(Channels.Player.Control, cmd, payload);
    });
    // Single-owner: broadcast live state to other windows
    ipcMain.on(Channels.Player.State, (evt, state: PlayerState) => {
      this.lastPlayerState = state;
      // Prefer WindowManager registry to avoid platform anomalies of BrowserWindow.getAllWindows()
      const candidates: (BrowserWindow | null)[] = [
        this.windowManager.get(WindowKey.MAIN),
        this.windowManager.get(WindowKey.MINI),
        this.windowManager.get(WindowKey.WORKER),
      ];
      const targets = candidates
        .filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
        .filter((w) => w.webContents.id !== evt.sender.id);

      // 调试输出已移除

      let delivered = 0;
      for (const w of targets) {
        try { w.webContents.send(Channels.Player.State, state); delivered++; } catch { }
      }
      // 调试输出已移除
    });
    // Request current state from owner (main) and rely on broadcast back
    ipcMain.on(Channels.Player.RequestState, (evt) => {
      // 先用缓存立即响应，以提升新窗口首屏体验
      if (this.lastPlayerState) {
        try { evt.sender.send(Channels.Player.State, this.lastPlayerState); } catch { }
      }
      // 再请求 MAIN 渲染进程广播最新状态，确保一致性
      const main = this.windowManager.get(WindowKey.MAIN);
      main?.webContents.send(Channels.Player.RequestState);
    });
  }

  /* -------------------------- 曲目相关 --------------------------- */
  private registerTrackHandlers(): void {
    ipcMain.handle(
      Channels.Track.GetInfo,
      async (_evt: IpcMainInvokeEvent, platform: Platform, platform_unique_id: string) => {
        return await this.trackService.getTrackInfo(platform, platform_unique_id);
      },
    );

    ipcMain.handle(
      Channels.Library.AddTrackToLibrary,
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.addTrackToLibrary(track);
      },
    );

    ipcMain.handle(
      Channels.Library.RemoveTrackFromLibrary,
      async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
        return await this.trackService.removeTrackFromLibrary(track);
      },
    );

    // 更新曲目基础信息（title/artist/album）- 通过二元主键定位
    ipcMain.handle(
      Channels.Track.UpdateBasic,
      async (_evt: IpcMainInvokeEvent, payload: { platform: string; platform_unique_id: string; title?: string; artist?: string; album?: string }) => {
        if (!payload || typeof payload.platform !== 'string' || typeof payload.platform_unique_id !== 'string') {
          throw new Error('invalid payload');
        }
        return await this.trackService.updateBasicInfo(payload);
      },
    );

    // 仅清洗（不落库）：返回建议的 title/artist/album
    ipcMain.handle(
      Channels.Track.CleanBasic,
      async (_evt: IpcMainInvokeEvent, payload: { title: string; artist?: string; album?: string }) => {
        const { title, artist, album } = payload || { title: '' };
        return await this.aiText.cleanBasic(String(title ?? ''), String(artist ?? ''), String(album ?? ''));
      },
    );

    ipcMain.handle(Channels.Lyrics.Get, async (_evt: IpcMainInvokeEvent, track: TrackEntity) => {
      console.log('IPC: 获取歌词:', track);
      return await this.lyricService.getLyrics(track);
    });


    ipcMain.on(Channels.Library.IncreasePlayCount, async (_evt: IpcMainEvent, track: TrackEntity) => {
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

    const normalizeTrack = (t: any): TrackEntity | null => {
      if (!isTrackLike(t)) return null;

      const out: TrackEntity = {
        platform: t.platform,
        platform_unique_id: String(t.platform_unique_id ?? ''),
        title: String(t.title ?? ''),
        artist: String(t.artist ?? ''),
        album: String(t.album ?? ''),
        duration: Number(t.duration ?? 0) || 0,
        cover_src: httpsify(t.cover_src) || '',
        created_at: t.created_at ? new Date(t.created_at) : new Date(),
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

    ipcMain.handle(Channels.Search.GetResults, async (_evt: IpcMainInvokeEvent, keywords: string) => {
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

      // 仅标准化 + 去重（不进行 AI 清洗）
      const normalized = allTracksRaw
        .filter(isTrackLike)
        .map((t) => normalizeTrack(t))
        .filter(Boolean) as TrackEntity[];
      const track_result = dedupeTracks(normalized);

      const playlist_result = dedupePlaylists(
        allPlRaw.filter(isPlaylistLike),
      );

      const fusion: FusionSearchResult = { track_result, playlist_result };
      return fusion;
    });

    ipcMain.handle(Channels.Search.LocalSearch, async (_evt: IpcMainInvokeEvent, keywords: string) => {
      console.log('后端收到本地搜索请求:', keywords);
      return await this.trackService.localSearch(keywords);
    });


    ipcMain.handle(Channels.Search.GetPlaylistDetail, async (_evt: IpcMainInvokeEvent, platform: string, platform_unique_id: string) => {
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
  /** 新接口（Settings 全量/分支/patch） */
  private registerConfigV2Handlers() {
    ipcMain.handle(Channels.Config.GetAll, async () => {
      return await this.configService.getAll();
    });

    ipcMain.handle(Channels.Config.Get, async (_evt, key: string) => {
      return await this.configService.get(key);
    });

    ipcMain.handle(Channels.Config.Set, async (_evt, payload: { key: string; value: any }) => {
      if (!payload || typeof payload.key !== 'string') {
        console.warn('[config:set] invalid payload');
        return;
      }
      const next = await this.configService.set(payload.key, payload.value);
      // this.broadcastConfigChanged(next);
    });

    ipcMain.handle(Channels.Config.SetByPath, async (_evt, payload: { path: string; value: any }) => {
      if (!payload || typeof payload.path !== 'string') {
        console.warn('[config:setByPath] invalid payload');
        return;
      }
      const next = await this.configService.setByPath(payload.path, payload.value);
      // this.broadcastConfigChanged(next);
    });

    ipcMain.handle(Channels.Config.Patch, async (_evt, partial: Partial<Settings>) => {
      const next = await this.configService.patch(partial);
      // this.broadcastConfigChanged(next);
    });
  }


  /* -------------------------- 下载相关 --------------------------- */
  private registerDownloadHandlers(): void {
    ipcMain.handle(Channels.System.CalcFileCacheDiskUsage, async () => {
      return await this.fileCacheManager.getDiskUsage();
    });

    ipcMain.on(Channels.Library.DownloadFromHifini, async (_evt, track: TrackEntity) => {
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
            // 可选：mainWindow?.webContents.send('download-progress', { token, received, total });
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
    ipcMain.handle(Channels.System.GetUserDataPath, async () => this.dataPath.dbPath);

    ipcMain.on(Channels.System.RevealDB, async () => {
      const { shell } = require('electron');
      shell.showItemInFolder(this.dataPath.dbPath);
    });
  }


}
