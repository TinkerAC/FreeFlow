import { inject, injectable } from 'inversify';
import { DISymbol } from '@main/di/symbol';
import { ProviderManager } from '@main/core/ProviderManager';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

@injectable()
export class SearchService {
  constructor(
    @inject(DISymbol.ProviderManager) private readonly providerManager: ProviderManager,
  ) {}

  async searchFusion(keyword: string): Promise<FusionSearchResult> {
    // 当所有 Provider 都禁用或不支持搜索时，统一返回空结果以降低调用方判断成本
    const EMPTY: FusionSearchResult = { track_result: [], playlist_result: [] };
    const tasks: Array<Promise<FusionSearchResult>> = [];

    for (const { provider } of this.providerManager.listEnabled()) {
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
