import type {
  ResourceRankingConfig,
  ResourceRankingRecord,
  ScoredResourceRecord,
} from '../../modules/resources/resource.ranking.shared.js';

/**
 * SQLite 种子库里的最小轨道字段集合。
 * 这些字段只用于构造模拟实验语料，不直接暴露给排序器。
 */
export type SeedTrackRow = {
  id: number;
  platform: string;
  platform_unique_id: string | null;
  title: string;
  artist: string;
  album: string;
  duration: number;
  played_count: number | null;
  created_at: string | null;
  modified_at: string | null;
};

/**
 * 每个分组对应一组“同艺术家 + 同专辑”的曲目簇。
 * 实验会基于这些簇构造可控的相关性标签与多种查询类型。
 */
export type SimulationGroupDefinition = {
  key: string;
  artist: string;
  album: string;
  limit: number;
  genreLabel: string;
  descriptionHint: string;
};

/**
 * 实验语料只保留排序器真实会使用到的字段，再额外挂上 simulation 元信息，
 * 方便后续输出案例、分析分组与追溯来源种子。
 */
export type SimulatedResourceRecord = ResourceRankingRecord & {
  simulation: {
    groupKey: string;
    groupRank: number;
    seedTrackId: number;
    seedPlatform: string;
    seedPlayedCount: number;
  };
};

export type SimulationGroup = SimulationGroupDefinition & {
  rows: SeedTrackRow[];
  records: SimulatedResourceRecord[];
};

export type SimulationCorpus = {
  records: SimulatedResourceRecord[];
  groups: SimulationGroup[];
  groupsByKey: Record<string, SimulationGroup>;
};

/**
 * relevance 采用 graded relevance，值越大表示相关性越高。
 * 这样评估指标可以同时支持 P@10、MRR 与 nDCG@10。
 */
export type ExperimentQuery = {
  id: string;
  category: string;
  text: string;
  relevance: Record<string, number>;
};

export type ExperimentMethod = {
  key: string;
  label: string;
  config?: ResourceRankingConfig;
  rank: (
    queryText: string,
    recordsToRank?: SimulatedResourceRecord[],
  ) => ScoredResourceRecord<SimulatedResourceRecord>[];
};

export type MethodSummary = {
  method_key: string;
  method_label: string;
  precision_at_10: number;
  precision_at_10_pct: number;
  mrr: number;
  mrr_pct: number;
  ndcg_at_10: number;
  ndcg_at_10_pct: number;
  zero_result_rate: number;
  zero_result_rate_pct: number;
  avg_latency_ms: number;
};

export type LatencySummary = {
  candidate_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
};

export type QueryCategorySummary = {
  category: string;
  count: number;
};

export type RepresentativeCase = {
  id: string;
  category: string;
  text: string;
  relevant: Record<string, number>;
  top_results: Array<{
    id: string;
    title: string | null;
    score: number;
    reasons: string[];
  }>;
};

/**
 * 数据集画像用于把“导入了多大样本、实际抽了多少语料、查询集有多大”
 * 这些信息稳定输出到报表里，方便论文和后续复现实验时直接引用。
 */
export type DatasetProfile = {
  source_key: string;
  source_label: string;
  imported_track_count?: number;
  imported_release_count?: number;
  imported_artist_count?: number;
  core_group_count: number;
  core_record_count: number;
  distractor_record_count: number;
  corpus_record_count: number;
  query_count: number;
};

/**
 * 标注规划不直接绑定某一种数据源。
 * 它描述的是“哪些查询需要人工判断、每类做多少、预计工作量有多少”。
 */
export type AnnotationCategoryPlan = {
  category: string;
  annotation_mode: 'manual' | 'spot_check' | 'auto_label';
  query_count: number;
  pool_depth: number;
  estimated_judgements: number;
};

export type AnnotationQueryPlan = {
  query_id: string;
  category: string;
  text: string;
  annotation_mode: 'manual' | 'spot_check' | 'auto_label';
  pool_depth: number;
  relevant_group_key: string;
  relevant_group_label: string;
};

export type ExperimentScalePlan = {
  benchmark_label: string;
  main_corpus_target: number;
  latency_candidate_tiers: number[];
  manual_query_count: number;
  spot_check_query_count: number;
  auto_label_query_count: number;
  estimated_manual_judgements: number;
  estimated_total_judgements: number;
  category_plan: AnnotationCategoryPlan[];
  query_plan: AnnotationQueryPlan[];
};
