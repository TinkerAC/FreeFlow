import { inject, injectable } from 'inversify';
import { ConfigService } from '@main/core/configService';
import { DISymbol } from '@main/di/symbol';
import { Platform } from '@main/core/enum/Platform';
import { AbstractContentProvider } from '@main/contentProvider/AbstractContentProvider';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { Logger } from 'winston';

type ProviderToggles = {
  netease?: boolean;
  qq?: boolean;
  bilibili?: boolean;
  youtubeMusic?: boolean;
  hifini?: boolean;
};

@injectable()
export class ProviderManager {
  constructor(
    @inject(DISymbol.ConfigService) private readonly config: ConfigService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netease: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qq: QQMusic,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
    @inject(DISymbol.YouTubeMusic) private readonly youtube: YouTubeMusic,
    @inject(DISymbol.HifiniMusic) private readonly hifini: HifiniMusic,
    @inject(DISymbol.Logger) private readonly logger: Logger,
  ) {
  }

  isEnabled(platform: Platform): boolean {
    // 提供商开关
    const t = {
      netease: true,
      qq: true,
      bilibili: true,
      youtubeMusic: false,
      hifini: true,
    };
    switch (platform) {
      case Platform.NET_EASE_CLOUD_MUSIC:
        return t.netease !== false;
      case Platform.QQ_MUSIC:
        return t.qq !== false;
      case Platform.BILIBILI:
        return t.bilibili !== false;
      case Platform.YOUTUBE_MUSIC:
        return t.youtubeMusic !== false;
      case Platform.HIFINI:
        return t.hifini !== false;
      case Platform.LOCAL:
        return true;
      default:
        return true;
    }
  }

  tryResolve(platform: Platform): AbstractContentProvider | null {
    if (!this.isEnabled(platform)) return null;
    switch (platform) {
      case Platform.NET_EASE_CLOUD_MUSIC:
        return this.netease;
      case Platform.QQ_MUSIC:
        return this.qq;
      case Platform.BILIBILI:
        return this.bilibili;
      case Platform.YOUTUBE_MUSIC:
        return this.youtube;
      case Platform.HIFINI:
        return this.hifini;
      default:
        return null;
    }
  }

  resolve(platform: Platform): AbstractContentProvider {
    const p = this.tryResolve(platform);
    if (!p) throw new Error(`Provider disabled or not found: ${platform}`);
    return p;
  }

  listEnabled(): Array<{ platform: Platform; provider: AbstractContentProvider }> {
    const out: Array<{ platform: Platform; provider: AbstractContentProvider }> = [];
    (Object.values(Platform) as Platform[]).forEach((pf) => {
      const p = this.tryResolve(pf);
      if (p) out.push({ platform: pf, provider: p });
    });
    return out;
  }

  getEnabledProviders(): AbstractContentProvider[] {
    return this.listEnabled().map(({ provider }) => provider);
  }


  /* ---------------------- 聚合搜索 ---------------------- */
  async searchFusion(keyword: string): Promise<FusionSearchResult> {
    const EMPTY: FusionSearchResult = { track_result: [], playlist_result: [] };
    const tasks: Array<Promise<FusionSearchResult>> = [];

    for (const { provider } of this.listEnabled()) {
      // 同时兼容 provider.search 与仅有 searchTracks 的实现
      const p: any = provider as any;
      if (typeof p.search === 'function') {
        tasks.push(
          Promise.resolve()
            .then(() => p.search(keyword))
            .catch(() => EMPTY),
        );
      } else if (typeof (provider as any).searchTrack === 'function') {
        tasks.push(
          Promise.resolve()
            .then(async (): Promise<FusionSearchResult> => ({
              track_result: await (provider as any).searchTrack(keyword, true),
              playlist_result: [] as PlaylistEntity[],
            }))
            .catch(() => EMPTY),
        );
      }
    }

    if (tasks.length === 0) return EMPTY;
    const results = await Promise.all(tasks);
    const allTracks = results.flatMap((r) => r?.track_result ?? []);
    const allPlaylists = results.flatMap((r) => r?.playlist_result ?? []);
    return {
      track_result: this.dedupeTracks(allTracks),
      playlist_result: allPlaylists, // playlist 去重按需扩展
    };
  }


  /* ---------------------- 聚合工具 ---------------------- */
  private normalizeCover(url?: string): string {
    if (!url) return '';
    if (url.startsWith('//')) return `https:${url}`;
    return url.replace(/^http:\/\//i, 'https://');
  }

  private dedupeTracks(arr: TrackEntity[]): TrackEntity[] {
    const seen = new Set<string>();
    const out: TrackEntity[] = [];
    for (const t of arr) {
      if (!t?.platform_unique_id) continue;
      const key = `${t.platform}:${t.platform_unique_id}`;
      if (seen.has(key)) continue;
      // 轻度规范化封面
      if (typeof t.cover_src === 'string') t.cover_src = this.normalizeCover(t.cover_src);
      seen.add(key);
      out.push(t);
    }
    return out;
  }
}
