import { performance } from 'node:perf_hooks';
import {
  DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG,
  normalizeChainSearchQuery,
  rankResourceRecordsWithConfig,
  type ScoredResourceRecord,
} from '../../modules/resources/resource.ranking.shared.js';
import { rankResourceRecords } from '../../modules/resources/resource.ranking.js';
import { buildResourceKey, makeTypo, NOW, removeSpaces } from './simulation.js';
import type { ProgressTask } from './progress.js';
import type {
  ExperimentMethod,
  ExperimentQuery,
  LatencySummary,
  MethodSummary,
  QueryCategorySummary,
  RepresentativeCase,
  SimulatedResourceRecord,
} from './types.js';

function precisionAtK(
  results: Array<ScoredResourceRecord<SimulatedResourceRecord>>,
  relevance: Record<string, number>,
  k: number,
) {
  const topK = results.slice(0, k);
  if (topK.length === 0) return 0;
  const relevant = topK.filter((item) => (relevance[item.record.id] ?? 0) > 0).length;
  return relevant / k;
}

function reciprocalRank(
  results: Array<ScoredResourceRecord<SimulatedResourceRecord>>,
  relevance: Record<string, number>,
) {
  const index = results.findIndex((item) => (relevance[item.record.id] ?? 0) > 0);
  return index === -1 ? 0 : 1 / (index + 1);
}

function dcgAtK(
  results: Array<ScoredResourceRecord<SimulatedResourceRecord>>,
  relevance: Record<string, number>,
  k: number,
) {
  return results.slice(0, k).reduce((sum, item, index) => {
    const grade = relevance[item.record.id] ?? 0;
    if (grade <= 0) return sum;
    return sum + (2 ** grade - 1) / Math.log2(index + 2);
  }, 0);
}

function ndcgAtK(
  results: Array<ScoredResourceRecord<SimulatedResourceRecord>>,
  relevance: Record<string, number>,
  k: number,
) {
  const actual = dcgAtK(results, relevance, k);
  const idealGrades = Object.values(relevance)
    .filter((grade) => grade > 0)
    .sort((left, right) => right - left)
    .slice(0, k);

  const ideal = idealGrades.reduce((sum, grade, index) => {
    return sum + (2 ** grade - 1) / Math.log2(index + 2);
  }, 0);

  return ideal > 0 ? actual / ideal : 0;
}

/**
 * 延迟基准统一采用“先预热、后采样”的方式，
 * 避免第一次执行的 JIT 与缓存命中把平均值拉偏。
 */
function benchmarkAverageLatency(fn: () => void, iterations = 24) {
  for (let index = 0; index < 6; index += 1) fn();
  const startedAt = performance.now();
  for (let index = 0; index < iterations; index += 1) fn();
  return (performance.now() - startedAt) / iterations;
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index] ?? 0;
}

function matchesBaseline(record: SimulatedResourceRecord, keyword: string) {
  const normalized = normalizeChainSearchQuery(keyword);
  if (!normalized.normalized) return true;

  const values = [
    record.title,
    record.artistName,
    record.albumName,
    record.genreLabel,
    record.description,
    record.tokenId,
    record.musicAssetAddress,
    record.platformHubAddress,
    record.publishTxHash,
    record.audioStorageObject?.cid ?? null,
    record.coverStorageObject?.cid ?? null,
    record.metadataStorageObject?.cid ?? null,
    buildResourceKey(record),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => String(value).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim());

  return values.some((value) => value.includes(normalized.normalized));
}

function sqlContainsBaseline(records: SimulatedResourceRecord[], keyword: string) {
  return records
    .filter((record) => matchesBaseline(record, keyword))
    .map((record) => ({
      record,
      score: 0,
      reasons: [],
      features: {},
      matched: true,
    }))
    .sort((left, right) => {
      const rightTime = (right.record.publishedAt ?? right.record.updatedAt).getTime();
      const leftTime = (left.record.publishedAt ?? left.record.updatedAt).getTime();
      return rightTime - leftTime;
    });
}

function idsWithScores(results: Array<ScoredResourceRecord<SimulatedResourceRecord>>, limit = 10) {
  return results.slice(0, limit).map((item) => [item.record.id, item.score]);
}

/**
 * 这一步用于保护“共享打分器重构”不会引入行为漂移。
 * 如果完整配置下的共享排序和正式 rankResourceRecords 不一致，实验会直接失败。
 */
export function validateFullRankingParity(
  records: SimulatedResourceRecord[],
  queries: ExperimentQuery[],
  progress?: ProgressTask,
) {
  const step = Math.max(1, Math.ceil(queries.length / 16));
  const probeQueries = queries.filter((_, index) => index % step === 0).slice(0, 16);

  for (const query of probeQueries) {
    const actual = idsWithScores(rankResourceRecords(records, query.text, NOW));
    const derived = idsWithScores(
      rankResourceRecordsWithConfig(records, query.text, DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG, NOW),
    );

    if (JSON.stringify(actual) !== JSON.stringify(derived)) {
      throw new Error(`完整排序在 ${query.id} 上出现不一致。`);
    }
    progress?.tick(query.id);
  }

  progress?.done('一致性校验完成');
}

export function buildMethods(records: SimulatedResourceRecord[]): ExperimentMethod[] {
  return [
    {
      key: 'sql_contains',
      label: 'SQL contains baseline',
      rank: (queryText, recordsToRank = records) => sqlContainsBaseline(recordsToRank, queryText),
    },
    {
      key: 'text_only',
      label: '仅文本打分',
      config: { text: true, fuzzy: true, identity: false, freshness: false, popularity: false },
      rank: (queryText, recordsToRank = records) =>
        rankResourceRecordsWithConfig(recordsToRank, queryText, {
          text: true,
          fuzzy: true,
          identity: false,
          freshness: false,
          popularity: false,
        }, NOW),
    },
    {
      key: 'text_identity',
      label: '文本 + 身份字段',
      config: { text: true, fuzzy: true, identity: true, freshness: false, popularity: false },
      rank: (queryText, recordsToRank = records) =>
        rankResourceRecordsWithConfig(recordsToRank, queryText, {
          text: true,
          fuzzy: true,
          identity: true,
          freshness: false,
          popularity: false,
        }, NOW),
    },
    {
      key: 'full_ranker',
      label: '完整链上资源排序',
      config: DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG,
      rank: (queryText, recordsToRank = records) => rankResourceRecords(recordsToRank, queryText, NOW),
    },
  ];
}

export function summarizeMethods(
  methods: ExperimentMethod[],
  queries: ExperimentQuery[],
  progressFactory?: (label: string, total: number) => ProgressTask,
) {
  const latencyProbeStep = Math.max(1, Math.ceil(queries.length / 18));
  const latencyProbeQueries = queries.filter((_, index) => index % latencyProbeStep === 0).slice(0, 18);
  const latencyIterations = queries.length >= 180 ? 12 : queries.length >= 100 ? 18 : 28;

  return methods.map((method) => {
    let precisionTotal = 0;
    let mrrTotal = 0;
    let ndcgTotal = 0;
    let zeroResultCount = 0;
    const progress = progressFactory?.(
      `评估 ${method.label}`,
      queries.length + latencyProbeQueries.length,
    );

    for (const query of queries) {
      const results = method.rank(query.text).slice(0, 10);
      precisionTotal += precisionAtK(results, query.relevance, 10);
      mrrTotal += reciprocalRank(results, query.relevance);
      ndcgTotal += ndcgAtK(results, query.relevance, 10);
      if (results.length === 0) zeroResultCount += 1;
      progress?.tick(query.id);
    }

    const latencySamples = latencyProbeQueries.map((query) => {
      const value = benchmarkAverageLatency(() => {
        method.rank(query.text);
      }, latencyIterations);
      progress?.tick(`latency:${query.id}`);
      return value;
    });

    const averageLatencyMs = latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length;
    progress?.done(`${method.label} 完成`);

    return {
      method_key: method.key,
      method_label: method.label,
      precision_at_10: precisionTotal / queries.length,
      precision_at_10_pct: (precisionTotal / queries.length) * 100,
      mrr: mrrTotal / queries.length,
      mrr_pct: (mrrTotal / queries.length) * 100,
      ndcg_at_10: ndcgTotal / queries.length,
      ndcg_at_10_pct: (ndcgTotal / queries.length) * 100,
      zero_result_rate: zeroResultCount / queries.length,
      zero_result_rate_pct: (zeroResultCount / queries.length) * 100,
      avg_latency_ms: averageLatencyMs,
    };
  });
}

function expandRecords(records: SimulatedResourceRecord[], targetCount: number) {
  const pool: SimulatedResourceRecord[] = [];
  let cloneIndex = 0;

  while (pool.length < targetCount) {
    for (const record of records) {
      if (pool.length >= targetCount) break;

      const serial = pool.length + 1;
      const offsetMs = cloneIndex * 90 * 60 * 1000;
      pool.push({
        ...record,
        id: `${record.id}-pool-${serial}`,
        tokenId: String(5_000 + serial),
        musicAssetAddress: `0x${(80_000 + serial).toString(16).padStart(40, '0')}`,
        publishTxHash: `0x${(280_000 + serial).toString(16).padStart(64, '0')}`,
        audioStorageObject: { cid: `bafy${`${record.id}${serial}audio`.replace(/[^a-z2-7]/g, 'a').padEnd(34, 'a').slice(0, 34)}` },
        coverStorageObject: { cid: `bafy${`${record.id}${serial}cover`.replace(/[^a-z2-7]/g, 'a').padEnd(34, 'a').slice(0, 34)}` },
        metadataStorageObject: { cid: `bafy${`${record.id}${serial}meta`.replace(/[^a-z2-7]/g, 'a').padEnd(34, 'a').slice(0, 34)}` },
        _count: {
          comments: (record._count.comments + serial) % 21,
          purchases: (record._count.purchases + serial) % 25,
        },
        publishedAt: new Date((record.publishedAt ?? record.updatedAt).getTime() - offsetMs),
        updatedAt: new Date(record.updatedAt.getTime() - offsetMs),
        createdAt: new Date(record.createdAt.getTime() - offsetMs),
      });
    }
    cloneIndex += 1;
  }

  return pool;
}

export function summarizeLatency(
  records: SimulatedResourceRecord[],
  progress?: ProgressTask,
) {
  const anchorRecords = [
    records[0],
    records[Math.min(records.length - 1, 7)],
    records[Math.min(records.length - 1, 31)],
    records[Math.min(records.length - 1, 63)],
    records[Math.min(records.length - 1, 127)],
  ].filter((record): record is SimulatedResourceRecord => Boolean(record));

  const queryTexts = [
    anchorRecords[0]?.title ?? '',
    makeTypo(anchorRecords[1]?.title ?? ''),
    anchorRecords[2] ? buildResourceKey(anchorRecords[2]) : '',
    anchorRecords[3]?.musicAssetAddress ?? '',
    anchorRecords[4]?.audioStorageObject?.cid ?? '',
    `${anchorRecords[0]?.artistName ?? ''} ${anchorRecords[0]?.albumName ?? ''}`.trim(),
    removeSpaces(anchorRecords[1]?.albumName ?? ''),
    anchorRecords[2]?.genreLabel ?? '',
  ].filter(Boolean);

  const candidateCounts = [
    Math.min(1_000, records.length),
    Math.min(5_000, records.length),
    Math.min(10_000, records.length),
    records.length,
  ].filter((count, index, list) => count > 0 && list.indexOf(count) === index);

  const results = candidateCounts.map((candidateCount) => {
    const pool = candidateCount > records.length ? expandRecords(records, candidateCount) : records.slice(0, candidateCount);
    const samples: number[] = [];

    for (let round = 0; round < 18; round += 1) {
      for (const queryText of queryTexts) {
        const startedAt = performance.now();
        rankResourceRecords(pool, queryText, NOW).slice(0, 10);
        samples.push(performance.now() - startedAt);
      }
    }

    return {
      candidate_count: candidateCount,
      avg_latency_ms: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      p95_latency_ms: percentile(samples, 0.95),
    };
  });

  for (const item of results) {
    progress?.tick(`${item.candidate_count} candidates`);
  }
  progress?.done('延迟采样完成');

  return results;
}

export function summarizeQueryCategories(queries: ExperimentQuery[]): QueryCategorySummary[] {
  const counts = new Map<string, number>();
  for (const query of queries) {
    counts.set(query.category, (counts.get(query.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

export function selectRepresentativeCases(
  records: SimulatedResourceRecord[],
  queries: ExperimentQuery[],
): RepresentativeCase[] {
  const selectedCategories = new Set(['typo', 'compact', 'resource_key']);
  const selectedQueries: ExperimentQuery[] = [];

  for (const query of queries) {
    if (selectedCategories.has(query.category)) {
      selectedQueries.push(query);
      selectedCategories.delete(query.category);
    }
    if (!selectedCategories.size) break;
  }

  return selectedQueries.map((query) => ({
    id: query.id,
    category: query.category,
    text: query.text,
    relevant: query.relevance,
    top_results: rankResourceRecords(records, query.text, NOW)
      .slice(0, 3)
      .map((item) => ({
        id: item.record.id,
        title: item.record.title,
        score: item.score,
        reasons: item.reasons,
      })),
  }));
}
