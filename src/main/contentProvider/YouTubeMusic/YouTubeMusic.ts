import { inject, injectable } from 'inversify';
import { Innertube, UniversalCache, YTNodes } from 'youtubei.js';

import { AbstractContentProvider } from '../AbstractContentProvider';
import { Platform } from '@main/core/enum/Platform';
import { TrackEntity, YouTubeMusicTrackModel } from '@src/shared/domainModel/TrackEntity';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { DISymbol } from '@main/di/symbol';
import { ConfigService } from '@main/core/configService';
import { Logger } from 'winston';

type YouTubeMusicSettings = {
  cookie?: string;
  visitorData?: string;
};

@injectable()
export default class YouTubeMusic extends AbstractContentProvider {
  public readonly platformName = Platform.YOUTUBE_MUSIC;
  public readonly serverNodes: string[] = [];

  private client?: Innertube;
  private clientPromise?: Promise<Innertube>;

  constructor(
    @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
  }

  public async searchTrack(keyword: string, _filterPaid: boolean = true): Promise<TrackEntity[]> {
    const items = await this.searchMusicItems(keyword, 'song');
    const seen = new Set<string>();
    return items
      .map((item) => this.toTrackEntity(item))
      .filter((track): track is TrackEntity => {
        if (!track) return false;
        const key = track.platform_unique_id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  public async search(keyword: string, filterPaid = true): Promise<FusionSearchResult> {
    const [tracks, playlists] = await Promise.all([
      this.searchTrack(keyword, filterPaid),
      this.searchPlaylists(keyword),
    ]);

    return {
      track_result: tracks,
      playlist_result: playlists,
    };
  }

  public async getTrackLink(uniqueId: string): Promise<string> {
    const client = await this.ensureClient();
    const info = await client.music.getInfo(uniqueId);
    const streaming = info?.streaming_data;

    const adaptive = streaming?.adaptive_formats ?? [];
    const formats = streaming?.formats ?? [];

    const audioFormat = [...adaptive, ...formats].find((format: any) => {
      if (!format) return false;
      if (typeof format.has_audio === 'boolean' && typeof format.has_video === 'boolean') {
        return format.has_audio && !format.has_video;
      }
      const mime = String(format.mime_type ?? format.mimeType ?? '').toLowerCase();
      return mime.includes('audio');
    });

    if (!audioFormat) {
      throw new Error(`[YouTubeMusic] 未找到可用的音频流: ${uniqueId}`);
    }

    if (typeof audioFormat.url === 'string' && audioFormat.url.length > 0) {
      return audioFormat.url;
    }

    if (typeof audioFormat.decipher === 'function') {
      try {
        return audioFormat.decipher(client.session.player);
      } catch (err) {
        throw new Error(`[YouTubeMusic] 解密音频流失败: ${String(err)}`);
      }
    }

    throw new Error(`[YouTubeMusic] 无法解析音频流 URL: ${uniqueId}`);
  }

  public async getLyrics(uniqueId: string): Promise<Lyric> {
    try {
      const client = await this.ensureClient();
      const response: any = await client.music.getLyrics(uniqueId);
      const lines = response?.lyrics?.lines;
      if (!Array.isArray(lines) || lines.length === 0) return;

      const originLines: LyricLine[] = lines
        .filter((line: any) => line?.words)
        .map((line: any) => {
          const start = Number(line?.startTimeMs ?? line?.start_time_ms ?? 0);
          return {
            time: Number.isFinite(start) ? start : 0,
            text: String(line.words ?? '').trim(),
          } satisfies LyricLine;
        });

      if (!originLines.length) return;
      return new Lyric(originLines, [], []);

    } catch (error) {
      console.warn('[YouTubeMusic] 获取歌词失败:', error);
      return new Lyric();
    }
  }

  public isFree(_song: any): boolean {
    return true;
  }

  private async searchPlaylists(keyword: string): Promise<PlaylistEntity[]> {
    const items = await this.searchMusicItems(keyword, 'playlist');
    const seen = new Set<string>();
    return items
      .map((item) => this.toPlaylistEntity(item))
      .filter((playlist): playlist is PlaylistEntity => {
        if (!playlist) return false;
        const key = playlist.platform_unique_id;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  private async searchMusicItems(
    keyword: string,
    type: 'song' | 'playlist',
  ): Promise<YTNodes.MusicResponsiveListItem[]> {
    const client = await this.ensureClient();
    const searchResponse: any = await client.music.search(keyword, { type });

    const collect = (candidate: any): YTNodes.MusicResponsiveListItem[] => {
      if (!candidate) return [];
      const pool: any[] = [];
      if (Array.isArray(candidate)) pool.push(...candidate);
      if (Array.isArray(candidate?.contents)) pool.push(...candidate.contents);
      if (Array.isArray(candidate?.results)) pool.push(...candidate.results);
      if (Array.isArray(candidate?.items)) pool.push(...candidate.items);
      return pool
        .filter(Boolean)
        .map((item) => {
          if (item instanceof YTNodes.MusicResponsiveListItem) return item;
          if (item?.constructor?.name === 'MusicResponsiveListItem') {
            return item as YTNodes.MusicResponsiveListItem;
          }
          return null;
        })
        .filter(Boolean) as YTNodes.MusicResponsiveListItem[];
    };

    const sections: YTNodes.MusicResponsiveListItem[] = [];
    sections.push(...collect(searchResponse));
    sections.push(...collect(searchResponse?.songs));
    sections.push(...collect(searchResponse?.playlists));
    sections.push(...collect(searchResponse?.contents));
    sections.push(...collect(searchResponse?.sections));
    sections.push(...collect(searchResponse?.tabs?.[0]?.content));

    return sections;
  }

  private toTrackEntity(item: YTNodes.MusicResponsiveListItem): TrackEntity | null {
    const videoId = item?.id ?? item?.endpoint?.payload?.videoId;
    if (!videoId) return null;

    const title = item?.title?.toString?.() ?? '';
    if (!title) return null;

    const artist = Array.isArray(item?.artists)
      ? item.artists
        .map((artist) => artist?.name)
        .filter(Boolean)
        .join(' / ')
      : item?.author?.name ?? '';

    const album = item?.album?.name ?? '';
    const raw = item as unknown as {
      duration_seconds?: number;
      duration?: { seconds?: number };
    };
    const duration = Number(raw?.duration_seconds ?? raw?.duration?.seconds ?? 0) || 0;
    const cover = this.pickThumbnail(item);

    return YouTubeMusicTrackModel.build({
      platform_unique_id: videoId,
      title,
      artist,
      album,
      duration,
      cover_src: cover,
    });
  }

  private toPlaylistEntity(item: YTNodes.MusicResponsiveListItem): PlaylistEntity | null {
    const raw = item as unknown as { playlist_id?: string };
    const playlistId = raw?.playlist_id ?? item?.id ?? item?.endpoint?.payload?.playlistId;
    if (!playlistId) return null;

    const title = item?.title?.toString?.() ?? '';
    if (!title) return null;

    const creator = Array.isArray(item?.artists)
      ? item.artists.map((artist) => artist?.name).filter(Boolean).join(' / ')
      : item?.author?.name ?? '';

    const cover = this.pickThumbnail(item);

    return new PlaylistEntity(
      0,
      Platform.YOUTUBE_MUSIC,
      playlistId,
      title,
      false,
      '',
      new Date(),
      [],
      creator,
      new Date(),
      cover,
    );
  }

  private pickThumbnail(item: YTNodes.MusicResponsiveListItem): string {
    const thumbs = (item as any)?.thumbnails ?? (item as any)?.thumbnail?.thumbnails ?? [];
    if (Array.isArray(thumbs) && thumbs.length > 0) {
      const usable = thumbs.find((thumb: any) => thumb?.url)?.url ?? thumbs[thumbs.length - 1]?.url;
      if (typeof usable === 'string') return usable.split('?')[0];
    }
    return '';
  }

  private async ensureClient(): Promise<Innertube> {
    if (this.client) return this.client;
    if (this.clientPromise) return this.clientPromise;

    this.clientPromise = this.createClient()
      .then((client) => {
        this.client = client;
        this.clientPromise = undefined;
        return client;
      })
      .catch((error) => {
        this.clientPromise = undefined;
        throw error;
      });

    return this.clientPromise;
  }

  private async createClient(): Promise<Innertube> {
    const settings = (this.configService.get('services.youtubeMusic') ?? {}) as YouTubeMusicSettings;
    const cookie = settings.cookie?.trim();
    const options: any = {
      cache: new UniversalCache(false),
      generate_session_locally: true,
    };

    if (cookie) {
      options.cookie = cookie;
    }

    if (settings.visitorData) {
      options.visitor_data = settings.visitorData;
    }

    return await Innertube.create(options);
  }
}
