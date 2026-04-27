import {
  DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG,
  normalizeChainSearchQuery,
  rankResourceRecordsWithConfig,
  type ResourceRankingRecord,
  type ScoredResourceRecord,
} from './resource.ranking.shared.js';

export const CHAIN_RESOURCE_RANKING_ALGORITHM = 'chain_resource_rank_v1';

export type ResourceRankPayload = {
  algorithm: typeof CHAIN_RESOURCE_RANKING_ALGORITHM;
  score: number;
  reasons: string[];
  features: Record<string, number>;
};

export type RankedResourceRecord<TRecord extends ResourceRankingRecord = ResourceRankingRecord> =
  ResourceRankPayload & ScoredResourceRecord<TRecord>;

export { normalizeChainSearchQuery } from './resource.ranking.shared.js';

/**
 * 正式搜索接口固定使用完整打分预设。
 * 实验入口会直接调用共享打分器，因此在启用全部维度时，
 * 消融实验与线上排序可以保持完全一致的结果。
 */
export function rankResourceRecords<TRecord extends ResourceRankingRecord>(
  records: TRecord[],
  keyword: string,
  now: Date = new Date(),
): RankedResourceRecord<TRecord>[] {
  return rankResourceRecordsWithConfig(records, keyword, DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG, now).map((item) => ({
    ...item,
    algorithm: CHAIN_RESOURCE_RANKING_ALGORITHM,
  }));
}
