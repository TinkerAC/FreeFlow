import { inject, injectable } from 'inversify';
import { AbstractContentProvider } from '@main/contentProvider/AbstractContentProvider';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';
import { distance } from 'fastest-levenshtein';
import { DISymbol } from '@main/di/symbol';
import type YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { ProviderManager } from '@main/core/ProviderManager';
import { Logger } from 'winston';
import { Platform } from '@main/core/enum/Platform';

/**
 * 辅助类型：用于存储每个平台的搜索结果及其排序后的候选列表
 */
type ProviderSearchResult = {
  provider: AbstractContentProvider;
  sortedTracks: TrackEntity[];
};

@injectable()
export class LyricService {

  constructor(
    @inject(DISymbol.NetEaseCloudMusic) private netEaseMusic: AbstractContentProvider,
    @inject(DISymbol.QQMusic) private qqMusic: AbstractContentProvider,
    @inject(DISymbol.YouTubeMusic) private youtubeMusic: YouTubeMusic,
    @inject(DISymbol.ProviderManager) private providerManager: ProviderManager,
    @inject(DISymbol.Logger) private logger: Logger,
  ) {
  }

  /**
   * 主入口函数：获取歌词
   */
  async getLyrics(track_model: TrackEntity): Promise<Lyric> {
    const { platform, platform_unique_id } = track_model;
    this.logger.info('加载歌词请求:', platform, platform_unique_id);

    if (!platform || !platform_unique_id) {
      throw new Error('无效的歌曲标识符: 缺少 platform_unique_id 字段');
    }

    // 1) 首选该平台 Provider (最快路径)
    try {
      const preferredLyric: Lyric = await this.getLyricFromPreferredProvider(platform as Platform, platform_unique_id);
      if (preferredLyric?.isValid()) {
        this.logger.info(`从首选平台 [${platform}] 成功获取歌词`);
        return preferredLyric;
      }
    } catch (e: any) {
      this.logger.warn(`首选平台 [${platform}] 获取歌词失败: ${e.message}`);
      // 忽略错误, 继续执行兜底逻辑
    }

    // 2) 兜底：跨平台搜索
    this.logger.info(`首选平台未找到有效歌词, 启动跨平台兜底搜索...`);
    return this.getLyricFromFallbackSearch(track_model);
  }

  // --- 私有辅助方法 ---
  /**
   * 步骤 1: 尝试从歌曲的原始平台获取歌词
   */
  private async getLyricFromPreferredProvider(platform: Platform, platform_unique_id: string): Promise<Lyric> {
    const provider = this.providerManager.tryResolve(platform);
    if (provider?.getLyrics) {
      return provider.getLyrics(platform_unique_id);
    }
  }

  /**
   * 步骤 2: 执行兜底逻辑，跨平台搜索并轮流尝试
   */
  private async getLyricFromFallbackSearch(track_model: TrackEntity): Promise<Lyric> {
    const keyword = `${track_model.title ?? ''} ${track_model.artist ?? ''}`.trim();
    if (!keyword) {
      this.logger.warn('无法执行兜底搜索: 关键词为空');
      return new Lyric();
    }

    // a. 并发搜索所有已启用的平台，并排序
    let enabled_provider = this.providerManager.getEnabledProviders();

    // 如果来源是不审查的平台，则只使用不审查的平台进行搜索
    const sourceProvider = this.providerManager.tryResolve(track_model.platform as Platform);
    if (sourceProvider && !sourceProvider.isCensored) {
      enabled_provider = enabled_provider.filter((p) => !p.isCensored);
    }

    const searchResults = await this.searchAndSortProviders(enabled_provider, keyword);

    // b. 找出候选列表的最大深度
    const maxCandidates = Math.max(...searchResults.map(r => r.sortedTracks.length));
    if (maxCandidates === 0) {
      this.logger.info('兜底搜索: 所有平台均未返回任何搜索结果');
      return new Lyric();
    }

    this.logger.info(`兜底搜索: 共 ${searchResults.length} 个平台, 最多 ${maxCandidates} 轮候选`);

    // c. "轮流" (Round-Robin) 尝试
    for (let i = 0; i < maxCandidates; i++) {
      // 按照 enabled_provider 的顺序轮流
      for (const { provider, sortedTracks } of searchResults) {

        const candidateTrack = sortedTracks[i]; // 取出当前平台的第 i 个最佳匹配
        if (!candidateTrack?.platform_unique_id) {
          continue; // 此平台已无更多候选者
        }

        // d. 尝试获取歌词并验证
        try {
          const lyric = await provider.getLyrics(candidateTrack.platform_unique_id);
          if (lyric.isValid()) {
            this.logger.info(`兜底成功: 从 [${provider.constructor.name}] 的第 ${i + 1} 候选 [${candidateTrack.title}] 找到有效歌词`);
            return lyric;
          }
        } catch (e: any) {
          this.logger.warn(`兜底尝试失败: [${provider.constructor.name}] 候选 [${candidateTrack.platform_unique_id}], ${e.message}`);
          // 忽略错误，尝试下一个
        }
      }
    }

    this.logger.info('兜底搜索完成: 尝试了所有候选者，未找到有效歌词');
    return new Lyric();
  }

  /**
   * 辅助函数: 并发搜索所有 provider，并对各自结果进行 Levenshtein 排序
   */
  private async searchAndSortProviders(providers: AbstractContentProvider[], keyword: string): Promise<ProviderSearchResult[]> {

    return Promise.all(
      providers.map(async (provider): Promise<ProviderSearchResult> => {
        try {
          // 1. 搜索
          const tracks = await this.searchTracksOnProvider(provider, keyword);

          // 2. 计算 Levenshtein 距离
          const tracksWithDistance = tracks.map(track => {
            const trackTitle = `${track.title ?? ''} ${track.artist ?? ''}`.trim();
            return {
              track,
              // 计算搜索词与结果的距离
              distance: distance(keyword, trackTitle || ''),
            };
          });

          // 3. 排序 (按 distance 升序, 0 = 完美匹配)
          tracksWithDistance.sort((a, b) => a.distance - b.distance);

          return {
            provider,
            sortedTracks: tracksWithDistance.map(item => item.track), // 仅保留排序后的 track
          };

        } catch (e: any) {
          this.logger.warn(`[${provider.constructor.name}] 搜索失败: ${e.message}`);
          return { provider, sortedTracks: [] }; // 出错则返回空列表
        }
      }),
    );
  }

  /**
   * 辅助函数: 安全地调用 provider 的 searchTrack 方法
   * (保留了原始代码中的 (provider as any) 逻辑，假设 searchTrack 不在 AbstractContentProvider 接口上)
   */
  private async searchTracksOnProvider(provider: AbstractContentProvider, keyword: string): Promise<TrackEntity[]> {
    if (typeof (provider as any).searchTrack === 'function') {
      const results = await (provider as any).searchTrack(keyword, false);
      return results ?? []; // 确保总是返回一个数组
    }
    this.logger.warn(`[${provider.constructor.name}] 不支持 searchTrack 方法`);
    return []; // Provider 不支持搜索
  }

}
