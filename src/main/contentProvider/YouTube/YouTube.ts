import {inject, injectable} from 'inversify';
import {Innertube, UniversalCache, YTNodes} from 'youtubei.js';

import {AbstractContentProvider} from '../AbstractContentProvider';
import {Platform} from '@main/core/enum/Platform';
import {TrackEntity, YouTubeMusicTrackModel} from '@src/shared/domainModel/TrackEntity';
import {Lyric} from '@src/shared/domainModel/lyricLine';
import {FusionSearchResult} from '@src/shared/domainModel/FusionSearchResult';
import {DISymbol} from '@main/di/symbol';
import {ConfigService} from '@main/core/configService';
import {Logger} from 'winston';

type YouTubeSettings = {
    cookie?: string;
    visitorData?: string;
};

@injectable()
export default class YouTube extends AbstractContentProvider {
    public readonly platformName = Platform.YOUTUBE;
    public readonly serverNodes: string[] = [];
    private searchClient?: Innertube;
    private playerClient?: Innertube;
    private searchClientPromise?: Promise<Innertube>;
    private playerClientPromise?: Promise<Innertube>;

    constructor(
        @inject(DISymbol.ConfigService) private readonly configService: ConfigService,
        @inject(DISymbol.Logger) protected readonly logger: Logger,
    ) {
        super();
    }

    public async searchTrack(keyword: string, _filterPaid: boolean = true): Promise<TrackEntity[]> {
        const items = await this.searchVideoItems(keyword);
        const seen = new Set<string>();
        const tracks = items
            .map((item) => this.toTrackEntity(item))
            .filter((track): track is TrackEntity => {
                if (!track) return false;
                const key = track.platform_unique_id;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });

        this.logger.info(`
YouTube 搜索结果:
  找到视频: ${tracks.length} 个
${tracks.map((track) => `  - ${track.title} (${track.duration}s)`).join('\n')}
`);

        return tracks;
    }

    public async search(keyword: string, filterPaid = true): Promise<FusionSearchResult> {
        const tracks = await this.searchTrack(keyword, filterPaid);
        return {
            track_result: tracks,
            playlist_result: [],
        };
    }

    public async getTrackLink(uniqueId: string): Promise<string> {
        const client = await this.ensurePlayerClient();
        const info = await client.getBasicInfo(uniqueId);
        const streaming = info?.streaming_data;

        const adaptive = streaming?.adaptive_formats ?? [];
        const formats = streaming?.formats ?? [];
        const allFormats = [...adaptive, ...formats];

        // Filter for audio-only formats
        const audioFormats = allFormats.filter((format: any) => {
            if (!format) return false;
            if (typeof format.has_audio === 'boolean' && typeof format.has_video === 'boolean') {
                return format.has_audio && !format.has_video;
            }
            const mime = String(format.mime_type ?? format.mimeType ?? '').toLowerCase();
            return mime.includes('audio');
        });

        this.logger.info(`[YouTube] Found ${audioFormats.length} audio formats for ${uniqueId}`);
        audioFormats.forEach((f: any) => {
            this.logger.info(`  - itag: ${f.itag}, mime: ${f.mime_type}, url: ${!!f.url}, decipher: ${!!f.decipher}`);
        });

        // 1. Prefer formats with direct URL
        const directFormat = audioFormats.find((f: any) => f.url);
        if (directFormat) {
            this.logger.info(`[YouTube] Using direct URL format itag: ${directFormat.itag}`);
            return directFormat.url;
        }

        // 2. If no direct URL, try to decipher
        // Try all formats that have decipher
        for (const format of audioFormats) {
            if (format.decipher) {
                try {
                    const url = await format.decipher(client.session.player);
                    if (url) {
                        this.logger.info(`[YouTube] Deciphered URL for itag: ${format.itag}`);
                        return url;
                    }
                } catch (e) {
                    this.logger.warn(`[YouTube] Decipher failed for format ${format.itag}: ${e}`);
                    continue;
                }
            }
        }

        if (audioFormats.length === 0) {
            // Fallback to video format if no audio-only format found
            const videoFormat = allFormats.find((format: any) => format.has_audio);
            if (videoFormat) {
                if (videoFormat.url) return videoFormat.url;
                if (videoFormat.decipher) return await videoFormat.decipher(client.session.player);
            }
            throw new Error(`[YouTube] 未找到可用的音频流: ${uniqueId}`);
        }

        throw new Error(`[YouTube] 无法解析音频流 URL: ${uniqueId}`);
    }

    public async getLyrics(_uniqueId: string): Promise<Lyric> {
        return new Lyric();
    }

    public isFree(_song: any): boolean {
        return true;
    }

    private async searchVideoItems(keyword: string): Promise<YTNodes.Video[]> {
        try {
            const client = await this.ensureSearchClient();
            const searchResponse = await client.search(keyword);

            if (!searchResponse.results) return [];

            return searchResponse.results.filter((item: any) => item.type === 'Video' || item.constructor?.name === 'Video') as YTNodes.Video[];
        } catch (error) {
            this.logger.error(`[YouTube] Search failed: ${error}`);
            return [];
        }
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
            album: '',
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

    private async ensureSearchClient(): Promise<Innertube> {
        if (this.searchClient) return this.searchClient;
        if (this.searchClientPromise) return this.searchClientPromise;

        this.searchClientPromise = this.createClient('WEB')
            .then((client) => {
                this.searchClient = client;
                this.searchClientPromise = undefined;
                return client;
            })
            .catch((error) => {
                this.searchClientPromise = undefined;
                throw error;
            });

        return this.searchClientPromise;
    }

    private async ensurePlayerClient(): Promise<Innertube> {
        if (this.playerClient) return this.playerClient;
        if (this.playerClientPromise) return this.playerClientPromise;

        this.playerClientPromise = this.createClient('ANDROID')
            .then((client) => {
                this.playerClient = client;
                this.playerClientPromise = undefined;
                return client;
            })
            .catch((error) => {
                this.playerClientPromise = undefined;
                throw error;
            });

        return this.playerClientPromise;
    }

    private async createClient(type: 'WEB' | 'ANDROID'): Promise<Innertube> {
        const settings = (this.configService.get('services.youtube') ?? {}) as YouTubeSettings;
        const cookie = settings.cookie?.trim();
        const options: any = {
            cache: new UniversalCache(false),
            generate_session_locally: true,
            gl: 'US',
            hl: 'en',
            client_type: type,
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
