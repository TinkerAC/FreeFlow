import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NOW } from './simulation.js';
import type {
  LatencySummary,
  MethodSummary,
  QueryCategorySummary,
  RepresentativeCase,
  SimulationCorpus,
} from './types.js';

function toCsv<Row extends Record<string, string | number>>(rows: Row[], columns: Array<keyof Row>) {
  const header = columns.join(',');
  const body = rows
    .map((row) => columns.map((column) => String(row[column])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

function toMarkdownTable<Row extends Record<string, string | number>>(rows: Row[], columns: Array<keyof Row>) {
  const header = `| ${columns.map(String).join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((row) => `| ${columns.map((column) => String(row[column])).join(' | ')} |`)
    .join('\n');
  return `${header}\n${separator}\n${body}`;
}

function shortText(value: string, maxLength = 48) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatFloat(value: number) {
  return value.toFixed(4);
}

/**
 * 报表输出与实验计算分离，便于后续单独替换 CSV/Markdown/JSON 结构，
 * 而不影响排序逻辑与指标评估本身。
 */
export function writeExperimentOutputs(input: {
  repoRoot: string;
  sourceStats: Record<string, number>;
  corpus: SimulationCorpus;
  methodSummary: MethodSummary[];
  latencySummary: LatencySummary[];
  categorySummary: QueryCategorySummary[];
  representativeCases: RepresentativeCase[];
}) {
  const figuresDataDir = resolve(input.repoRoot, 'papers/Latex-Mine/figures/data');
  const experimentOutDir = resolve(input.repoRoot, 'papers/Latex-Mine/out/experiments');

  mkdirSync(figuresDataDir, { recursive: true });
  mkdirSync(experimentOutDir, { recursive: true });

  writeFileSync(
    resolve(figuresDataDir, 'search_ranking_metrics.csv'),
    toCsv(input.methodSummary, [
      'method_key',
      'method_label',
      'precision_at_10',
      'precision_at_10_pct',
      'mrr',
      'mrr_pct',
      'ndcg_at_10',
      'ndcg_at_10_pct',
      'zero_result_rate',
      'zero_result_rate_pct',
      'avg_latency_ms',
    ]),
    'utf8',
  );

  writeFileSync(
    resolve(figuresDataDir, 'search_latency_candidates.csv'),
    toCsv(input.latencySummary, ['candidate_count', 'avg_latency_ms', 'p95_latency_ms']),
    'utf8',
  );

  writeFileSync(
    resolve(figuresDataDir, 'search_query_categories.csv'),
    toCsv(input.categorySummary, ['category', 'count']),
    'utf8',
  );

  writeFileSync(
    resolve(experimentOutDir, 'search_ranking_summary.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dataset: {
          resource_count: input.corpus.records.length,
          query_count: input.categorySummary.reduce((sum, item) => sum + item.count, 0),
          reference_time: NOW.toISOString(),
          simulated_group_count: input.corpus.groups.length,
        },
        seed_statistics: input.sourceStats,
        groups: input.corpus.groups.map((group) => ({
          key: group.key,
          artist: group.artist,
          album: group.album,
          genre_label: group.genreLabel,
          track_count: group.records.length,
        })),
        sample_tracks: input.corpus.records.map((record) => ({
          id: record.id,
          title: record.title,
          artist: record.artistName,
          album: record.albumName,
          genre_label: record.genreLabel,
          token_id: record.tokenId,
        })),
        methods: input.methodSummary,
        latency: input.latencySummary,
        query_categories: input.categorySummary,
        representative_cases: input.representativeCases,
      },
      null,
      2,
    ),
    'utf8',
  );

  const markdownRows = input.methodSummary.map((item) => ({
    方法: item.method_label,
    'P@10': formatFloat(item.precision_at_10),
    MRR: formatFloat(item.mrr),
    'nDCG@10': formatFloat(item.ndcg_at_10),
    '零结果率': formatPercent(item.zero_result_rate_pct),
    '平均延迟(ms)': item.avg_latency_ms.toFixed(4),
  }));

  const latencyRows = input.latencySummary.map((item) => ({
    候选集规模: item.candidate_count,
    '平均延迟(ms)': item.avg_latency_ms.toFixed(4),
    'P95延迟(ms)': item.p95_latency_ms.toFixed(4),
  }));

  const groupRows = input.corpus.groups.map((group) => ({
    分组: group.key,
    艺术家: shortText(group.artist, 20),
    专辑: shortText(group.album, 34),
    曲目数: group.records.length,
  }));

  const summaryMarkdown = [
    '# Search Ranking Experiment',
    '',
    `- Indexed resources: ${input.corpus.records.length}`,
    `- Query set size: ${input.categorySummary.reduce((sum, item) => sum + item.count, 0)}`,
    `- Simulated artist/album clusters: ${input.corpus.groups.length}`,
    `- Reference timestamp: ${NOW.toISOString()}`,
    '',
    '## Retrieval Metrics',
    '',
    toMarkdownTable(markdownRows, ['方法', 'P@10', 'MRR', 'nDCG@10', '零结果率', '平均延迟(ms)']),
    '',
    '## Cluster Layout',
    '',
    toMarkdownTable(groupRows, ['分组', '艺术家', '专辑', '曲目数']),
    '',
    '## Latency by Candidate Count',
    '',
    toMarkdownTable(latencyRows, ['候选集规模', '平均延迟(ms)', 'P95延迟(ms)']),
    '',
    '## Representative Cases',
    '',
    input.representativeCases
      .map((item) => {
        const resultLines = item.top_results
          .map((result, index) => `${index + 1}. ${result.title ?? ''} (${result.score.toFixed(3)}) - ${result.reasons.join(' / ')}`)
          .join('\n');
        return `### ${item.id} ${item.text}\n\n${resultLines}`;
      })
      .join('\n\n'),
    '',
  ].join('\n');

  writeFileSync(resolve(experimentOutDir, 'search_ranking_summary.md'), summaryMarkdown, 'utf8');
  return summaryMarkdown;
}
