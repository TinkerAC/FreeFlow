import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { Platform } from '@main/core/enum/Platform';
import { NotImplementedError } from '@main/core/exceptions/NotImplementedError';
import { IpcContext } from './ipcContext';

export function registerSearchHandlers({
  netEaseCloudMusic,
  qqMusic,
  bilibili,
  youtubeMusic,
  trackService,
}: IpcContext): void {
  const safe = async <T>(p: Promise<T>, label: string, fallback: T): Promise<T> => {
    try {
      return await p;
    } catch (error) {
      console.error(`[search:${label}] failed:`, error);
      return fallback;
    }
  };

  const httpsify = (u?: string) => {
    if (!u) return '';
    if (u.startsWith('//')) return `https:${u}`;
    return u.replace(/^http:\/\//i, 'https://');
  };

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
        out.push(p);
      }
    }
    return out;
  };

  ipcMain.handle(Channels.Search.GetResults, async (_evt: IpcMainInvokeEvent, keywords: string) => {
    console.log('后端收到搜索请求:', keywords);

    const EMPTY: FusionSearchResult = { track_result: [], playlist_result: [] };

    const neteaseP = netEaseCloudMusic?.search
      ? safe(netEaseCloudMusic.search(keywords), 'netease.search', EMPTY)
      : Promise.resolve(EMPTY);

    const qqP = qqMusic?.search
      ? safe(qqMusic.search(keywords), 'qq.search', EMPTY)
      : Promise.resolve(EMPTY);

    const bilibiliP = bilibili?.search
      ? safe(bilibili.search(keywords), 'bilibili.search', EMPTY)
      : Promise.resolve(EMPTY);

    const youtubeP = youtubeMusic?.search
      ? safe(youtubeMusic.search(keywords), 'youtube.search', EMPTY)
      : Promise.resolve(EMPTY);

    const results = await Promise.all([neteaseP, qqP, bilibiliP, youtubeP]);

    const allTracksRaw = results.flatMap((r) => r?.track_result ?? []);
    const allPlRaw = results.flatMap((r) => r?.playlist_result ?? []);

    const normalized = allTracksRaw
      .filter(isTrackLike)
      .map((t) => normalizeTrack(t))
      .filter(Boolean) as TrackEntity[];
    const track_result = dedupeTracks(normalized);

    const playlist_result = dedupePlaylists(allPlRaw.filter(isPlaylistLike));

    const fusion: FusionSearchResult = { track_result, playlist_result };
    return fusion;
  });

  ipcMain.handle(Channels.Search.LocalSearch, async (_evt: IpcMainInvokeEvent, keywords: string) => {
    console.log('后端收到本地搜索请求:', keywords);
    return await trackService.localSearch(keywords);
  });

  ipcMain.handle(
    Channels.Search.GetPlaylistDetail,
    async (_evt: IpcMainInvokeEvent, platform: string, platform_unique_id: string) => {
      console.log('后端收到获取歌单详情请求:', platform, platform_unique_id);
      switch (platform) {
        case Platform.NET_EASE_CLOUD_MUSIC:
          return await netEaseCloudMusic.getFullPlaylist(platform_unique_id);
        case Platform.QQ_MUSIC:
          throw NotImplementedError;
        case Platform.BILIBILI:
          throw NotImplementedError;
        default:
          throw new Error(`不支持的平台: ${platform}`);
      }
    },
  );
}

