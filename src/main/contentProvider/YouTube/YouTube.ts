import { inject, injectable } from 'inversify';
import { Innertube, UniversalCache, YTNodes } from 'youtubei.js';

import { AbstractContentProvider } from '../AbstractContentProvider';
import { Platform } from '@main/core/enum/Platform';
import { TrackEntity, YouTubeMusicTrackModel } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { DISymbol } from '@main/di/symbol';
import { ConfigService } from '@main/core/configService';
import { Logger } from 'winston';

type YouTubeSettings = {
  cookie?: string;
  visitorData?: string;
};

@injectable()
export default class YouTube extends AbstractContentProvider {
  public readonly platformName = Platform.YOUTUBE;
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
    const items = await this.searchVideoItems(keyword);
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
    const tracks = await this.searchTrack(keyword, filterPaid);
    // YouTube mainly returns videos, treating them as tracks. Playlists are possible but let's focus on tracks for now or implement playlist search if needed.
    // For now, let's return empty playlists or implement basic playlist search if easy.
    // Let's stick to tracks for the "Video Platform" provider as requested context implies separating music and video.
    
    return {
      track_result: tracks,
      playlist_result: [],
    };
  }

  public async getTrackLink(uniqueId: string): Promise<string> {
    const client = await this.ensureClient();
    const info = await client.getInfo(uniqueId); // Use general getInfo
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
      // Fallback to video format if no audio-only format found (unlikely for YouTube, but possible)
       const videoFormat = [...adaptive, ...formats].find((format: any) => {
          return format.has_audio;
       });
       if (videoFormat) return videoFormat.url || (videoFormat.decipher ? videoFormat.decipher(client.session.player) : '');

      throw new Error(`[YouTube] 未找到可用的音频流: ${uniqueId}`);
    }

    if (typeof audioFormat.url === 'string' && audioFormat.url.length > 0) {
      return audioFormat.url;
    }

    if (typeof audioFormat.decipher === 'function') {
      try {
        return audioFormat.decipher(client.session.player);
      } catch (err) {
        throw new Error(`[YouTube] 解密音频流失败: ${String(err)}`);
      }
    }

    throw new Error(`[YouTube] 无法解析音频流 URL: ${uniqueId}`);
  }

  public async getLyrics(_uniqueId: string): Promise<Lyric> {
    // YouTube videos usually don't have structured lyrics in the same way Music does.
    // Captions could be an option but that's complex. Returning empty for now.
    return new Lyric();
  }

  public isFree(_song: any): boolean {
    return true;
  }

  private async searchVideoItems(keyword: string): Promise<YTNodes.Video[]> {
    const client = await this.ensureClient();
    const searchResponse = await client.search(keyword);
    
    if (!searchResponse.results) return [];

    return searchResponse.results.filter((item: any) => item.type === 'Video' || item.constructor?.name === 'Video') as YTNodes.Video[];
  }

  private toTrackEntity(item: YTNodes.Video): TrackEntity | null {
    const videoId = item.id;
    if (!videoId) return null;

    const title = item.title?.text ?? item.title?.toString() ?? '';
    const artist = item.author?.name ?? '';
    const durationText = item.duration?.text ?? '';
    
    let duration = 0;
    if (durationText) {
        const parts = durationText.split(':').map(Number);
        if (parts.length === 2) {
            duration = parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
    }

    const cover = this.pickThumbnail(item);

    return YouTubeMusicTrackModel.build({
      platform_unique_id: videoId,
      title,
      artist,
      album: '', // YouTube videos don't strictly belong to an album in the search result context
      duration,
      cover_src: cover,
    });
  }

  private pickThumbnail(item: YTNodes.Video): string {
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
    const settings = (this.configService.get('services.youtube') ?? {}) as YouTubeSettings;
    const cookie = settings.cookie?.trim();
    const options: any = {
      cache: new UniversalCache(false),
      generate_session_locally: true,
      gl: 'US',
      hl: 'en',
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
