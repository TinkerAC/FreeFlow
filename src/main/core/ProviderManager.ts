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
  /** 统一维护的 Provider 实例表，方便集中管理 */
  private readonly providers = new Map<Platform, AbstractContentProvider>();

  /** Platform 对应配置项 key 的映射表（未在配置中的平台默认始终启用） */
  private readonly toggleKeyByPlatform: Partial<Record<Platform, keyof ProviderToggles>> = {
    [Platform.NET_EASE_CLOUD_MUSIC]: 'netease',
    [Platform.QQ_MUSIC]: 'qq',
    [Platform.BILIBILI]: 'bilibili',
    [Platform.YOUTUBE_MUSIC]: 'youtubeMusic',
    [Platform.HIFINI]: 'hifini',
  };

  constructor(
    @inject(DISymbol.ConfigService) private readonly config: ConfigService,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netease: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qq: QQMusic,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
    @inject(DISymbol.YouTubeMusic) private readonly youtube: YouTubeMusic,
    @inject(DISymbol.HifiniMusic) private readonly hifini: HifiniMusic,
    @inject(DISymbol.Logger) private readonly logger: Logger,
  ) {
    this.providers.set(Platform.NET_EASE_CLOUD_MUSIC, this.netease);
    this.providers.set(Platform.QQ_MUSIC, this.qq);
    this.providers.set(Platform.BILIBILI, this.bilibili);
    this.providers.set(Platform.YOUTUBE_MUSIC, this.youtube);
    this.providers.set(Platform.HIFINI, this.hifini);
  }

  /**
   * 读取配置中的 Provider 开关，如未配置则回退到默认开启。
   */
  private readToggles(): Required<ProviderToggles> {
    const toggles = (this.config.get('services.providers') ?? {}) as ProviderToggles;
    return {
      netease: toggles.netease !== false,
      qq: toggles.qq !== false,
      bilibili: toggles.bilibili !== false,
      youtubeMusic: true,
      hifini: toggles.hifini !== false,
    };
  }

  private getToggleKey(platform: Platform): keyof ProviderToggles | null {
    return this.toggleKeyByPlatform[platform] ?? null;
  }

  /**
   * 判断目标平台的 Provider 是否被启用。
   */
  isEnabled(platform: Platform, toggles?: Required<ProviderToggles>): boolean {
    const key = this.getToggleKey(platform);
    if (!key) return true;
    const resolved = toggles ?? this.readToggles();
    return resolved[key] !== false;
  }

  /**
   * 更新指定平台的启用状态，同时写回配置。
   */
  setEnabled(platform: Platform, enabled: boolean): void {
    const key = this.getToggleKey(platform);
    if (!key) {
      this.logger.warn(`Provider toggle ignored for platform without config key: ${platform}`);
      return;
    }
    this.config.setByPath(`services.providers.${key}`, enabled);
  }

  tryResolve(platform: Platform): AbstractContentProvider | null {
    if (!this.isEnabled(platform)) return null;
    return this.providers.get(platform) ?? null;
  }

  resolve(platform: Platform): AbstractContentProvider {
    const p = this.tryResolve(platform);
    if (!p) throw new Error(`Provider disabled or not found: ${platform}`);
    return p;
  }

  listEnabled(): Array<{ platform: Platform; provider: AbstractContentProvider }> {
    const out: Array<{ platform: Platform; provider: AbstractContentProvider }> = [];
    const toggles = this.readToggles();
    for (const [platform, provider] of this.providers.entries()) {
      if (this.isEnabled(platform, toggles)) out.push({ platform, provider });
    }
    return out;
  }

  getEnabledProviders(): AbstractContentProvider[] {
    return this.listEnabled().map(({ provider }) => provider);
  }


  /* ---------------------- 聚合搜索 ---------------------- */
  async searchFusion(keyword: string): Promise<FusionSearchResult> {
    // 当所有 Provider 都禁用或不支持搜索时，统一返回空结果以降低调用方判断成本
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
