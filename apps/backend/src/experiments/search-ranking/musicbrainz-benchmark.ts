import { buildReleaseResourceKey } from '../../modules/resources/resource.repository.js';
import { NOW, makeTypo, removeSpaces } from './simulation.js';
import type { ProgressTask } from './progress.js';
import type {
  AnnotationQueryPlan,
  DatasetProfile,
  ExperimentQuery,
  ExperimentScalePlan,
  SimulatedResourceRecord,
  SimulationCorpus,
  SimulationGroup,
} from './types.js';
import { MusicbrainzSource, type MusicbrainzCoreGroupRow, type MusicbrainzProfileRow, type MusicbrainzTrackRow } from './musicbrainz-source.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CHAIN_ID = 11155111;
const PLATFORM_HUB_ADDRESS = '0x00000000000000000000000000000000ff11aa22';

const CORE_GROUP_MIN_TRACKS = 6;
const CORE_GROUP_MAX_TRACKS = 18;
const CORE_GROUP_LIMIT = 48;
const TARGET_CORPUS_SIZE = 6_000;

type MusicbrainzBenchmarkGroup = SimulationGroup & {
  releaseId: number;
  releaseGid: string | null;
  releaseAlias: string | null;
  artistAlias: string | null;
  isCjk: boolean;
};

function seededNumber(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seed: string) {
  return seededNumber(seed) / 0xffffffff;
}

function makeAddress(index: number) {
  return `0x${index.toString(16).padStart(40, '0')}`;
}

function makeHash(index: number) {
  return `0x${index.toString(16).padStart(64, '0')}`;
}

function sanitizeSlug(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function makeCid(kind: string, slug: string, index: number) {
  const serial = index.toString(36).replace(/[0189]/g, 'a');
  const body = `${kind}${sanitizeSlug(slug)}${serial}mbset`
    .toLowerCase()
    .replace(/[^a-z2-7]/g, 'a')
    .padEnd(34, 'a')
    .slice(0, 34);
  return `bafy${body}`;
}

function toFullWidth(value: string) {
  return [...value].map((char) => {
    if (char === ' ') return '　';
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248);
    return char;
  }).join('');
}

function graded(entries: Array<[SimulatedResourceRecord, number]>) {
  return Object.fromEntries(entries.map(([record, grade]) => [record.id, grade]));
}

function topGraded(group: SimulationGroup, limit = 4) {
  return graded(
    group.records
      .slice(0, limit)
      .map((record, index) => [record, Math.max(1, 3 - index)]),
  );
}

function pushQuery(
  queries: ExperimentQuery[],
  category: string,
  text: string,
  relevance: Record<string, number>,
) {
  const normalized = text.trim();
  if (!normalized) return;
  const id = `q${String(queries.length + 1).padStart(3, '0')}`;
  queries.push({ id, category, text: normalized, relevance });
}

function isCjkText(value: string | null | undefined) {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/u.test(String(value ?? ''));
}

function pickDatePart(value: number | null | undefined, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Number(value);
}

function resolvePublishedAt(row: MusicbrainzTrackRow) {
  const year = pickDatePart(row.date_year, 0);
  if (year >= 1900 && year <= 2100) {
    const month = pickDatePart(row.date_month, 1);
    const day = pickDatePart(row.date_day, 1);
    return new Date(Date.UTC(year, Math.max(0, month - 1), day, 12, 0, 0, 0));
  }

  const lastUpdated = row.last_updated ? new Date(row.last_updated) : NOW;
  return new Date(lastUpdated);
}

function buildDescription(row: MusicbrainzTrackRow, kind: 'core' | 'distractor') {
  const parts = [
    kind === 'core' ? 'musicbrainz benchmark core group' : 'musicbrainz distractor sample',
    row.release_group_name ? `release group: ${row.release_group_name}` : null,
    row.genre_tag ? `tag: ${row.genre_tag}` : null,
    `disc ${row.medium_position} track ${row.track_position}`,
  ].filter(Boolean);

  return parts.join(' | ');
}

function buildResourceKey(record: SimulatedResourceRecord) {
  return buildReleaseResourceKey({
    chainId: record.chainId,
    musicAssetAddress: record.musicAssetAddress,
    tokenId: record.tokenId,
  }) ?? record.id;
}

function buildBenchmarkRecord(
  row: MusicbrainzTrackRow,
  index: number,
  input: {
    groupKey: string;
    groupRank: number;
    seedPlatform: string;
    seedPlayedCount: number;
    kind: 'core' | 'distractor';
  },
) {
  const publishedAt = resolvePublishedAt(row);
  const updatedAt = row.last_updated ? new Date(row.last_updated) : publishedAt;
  const createdAt = new Date(publishedAt.getTime() - (2 + (index % 5)) * DAY_MS);
  const comments = Math.floor(seededFraction(`comments:${row.mb_track_id}`) * 18) + (input.kind === 'core' ? 4 : 0);
  const purchases = Math.floor(seededFraction(`purchases:${row.mb_track_id}`) * 16) + (input.kind === 'core' ? 3 : 0);

  return {
    id: `mb-track-${row.mb_track_id}`,
    title: row.track_name,
    artistName: row.artist_name,
    albumName: row.release_name,
    genreLabel: row.genre_tag,
    description: buildDescription(row, input.kind),
    chainId: DEFAULT_CHAIN_ID,
    musicAssetAddress: makeAddress(500_000 + row.mb_track_id),
    platformHubAddress: PLATFORM_HUB_ADDRESS,
    tokenId: String(700_000 + row.mb_track_id),
    publishTxHash: makeHash(900_000 + row.mb_track_id),
    audioStorageObject: { cid: makeCid('audio', `${row.track_name}${row.artist_name}`, row.mb_track_id) },
    coverStorageObject: { cid: makeCid('cover', `${row.release_name}${row.artist_name}`, row.mb_track_id) },
    metadataStorageObject: { cid: makeCid('meta', `${row.track_name}${row.release_name}`, row.mb_track_id) },
    _count: {
      comments,
      purchases,
    },
    createdAt,
    updatedAt,
    publishedAt,
    simulation: {
      groupKey: input.groupKey,
      groupRank: input.groupRank,
      seedTrackId: row.mb_track_id,
      seedPlatform: input.seedPlatform,
      seedPlayedCount: input.seedPlayedCount,
    },
  } satisfies SimulatedResourceRecord;
}

function buildCoreGroups(
  coreGroupRows: MusicbrainzCoreGroupRow[],
  trackRows: MusicbrainzTrackRow[],
) {
  const rowsByReleaseId = new Map<number, MusicbrainzTrackRow[]>();
  for (const row of trackRows) {
    const bucket = rowsByReleaseId.get(row.release_id) ?? [];
    bucket.push(row);
    rowsByReleaseId.set(row.release_id, bucket);
  }

  const groups: MusicbrainzBenchmarkGroup[] = [];
  const records: SimulatedResourceRecord[] = [];

  for (const groupRow of coreGroupRows) {
    const releaseRows = rowsByReleaseId.get(groupRow.release_id) ?? [];
    if (releaseRows.length === 0) continue;

    const key = `release_${groupRow.release_id}`;
    const releaseAlias = releaseRows.find((item) => item.release_alias)?.release_alias ?? null;
    const artistAlias = releaseRows.find((item) => item.artist_alias)?.artist_alias ?? null;
    const genreLabel = releaseRows.find((item) => item.genre_tag)?.genre_tag
      ?? releaseRows[0]?.release_group_name
      ?? 'music';
    const descriptionHint = releaseRows[0]?.release_group_name ?? 'musicbrainz sample release';

    const groupRecords = releaseRows.map((row, index) => {
      const record = buildBenchmarkRecord(row, index, {
        groupKey: key,
        groupRank: index + 1,
        seedPlatform: 'musicbrainz-core',
        seedPlayedCount: Math.max(0, 100 - index * 4),
        kind: 'core',
      });
      records.push(record);
      return record;
    });

    groups.push({
      key,
      artist: groupRow.artist_name,
      album: groupRow.release_name,
      limit: groupRecords.length,
      genreLabel,
      descriptionHint,
      rows: [],
      records: groupRecords,
      releaseId: groupRow.release_id,
      releaseGid: groupRow.release_gid,
      releaseAlias,
      artistAlias,
      isCjk: isCjkText(groupRow.artist_name) || isCjkText(groupRow.release_name),
    });
  }

  return { groups, records };
}

function buildDistractorRecords(
  trackRows: MusicbrainzTrackRow[],
  startIndex: number,
) {
  return trackRows.map((row, index) => {
    return buildBenchmarkRecord(row, startIndex + index, {
      groupKey: `distractor_release_${row.release_id}`,
      groupRank: row.track_position,
      seedPlatform: 'musicbrainz-distractor',
      seedPlayedCount: 0,
      kind: 'distractor',
    });
  });
}

function findRecord(group: SimulationGroup, index: number) {
  const record = group.records[index];
  if (!record) {
    throw new Error(`实验分组 ${group.key} 缺少第 ${index + 1} 条记录。`);
  }
  return record;
}

function appendGroupQueries(
  queries: ExperimentQuery[],
  groups: MusicbrainzBenchmarkGroup[],
  input: {
    category: string;
    limit: number;
    build: (group: MusicbrainzBenchmarkGroup) => { text: string; relevance: Record<string, number> } | null;
  },
) {
  let count = 0;
  for (const group of groups) {
    if (count >= input.limit) break;
    const built = input.build(group);
    if (!built) continue;
    pushQuery(queries, input.category, built.text, built.relevance);
    count += 1;
  }
}

function buildQueries(groups: MusicbrainzBenchmarkGroup[]) {
  const queries: ExperimentQuery[] = [];
  const aliasGroups = groups.filter((group) => group.releaseAlias || group.artistAlias);
  const cjkGroups = groups.filter((group) => group.isCjk);
  const spacedTitleGroups = groups.filter((group) => /\s/.test(findRecord(group, 0).title ?? ''));
  const typoGroups = groups.filter((group) => {
    const title = findRecord(group, 0).title ?? '';
    return /^[\x20-\x7e]+$/.test(title) && title.length >= 8;
  });

  appendGroupQueries(queries, groups, {
    category: 'title_exact',
    limit: 24,
    build: (group) => {
      const record = findRecord(group, 0);
      return {
        text: record.title ?? '',
        relevance: graded([
          [record, 3],
          ...group.records.slice(1, 3).map((item, index) => [item, Math.max(1, 2 - index)] as [SimulatedResourceRecord, number]),
        ]),
      };
    },
  });

  appendGroupQueries(queries, groups, {
    category: 'album',
    limit: 24,
    build: (group) => ({
      text: group.album,
      relevance: topGraded(group, 5),
    }),
  });

  appendGroupQueries(queries, groups, {
    category: 'artist',
    limit: 18,
    build: (group) => ({
      text: group.artist,
      relevance: topGraded(group, 4),
    }),
  });

  appendGroupQueries(queries, groups, {
    category: 'title_artist',
    limit: 18,
    build: (group) => {
      const record = findRecord(group, 0);
      return {
        text: `${record.title ?? ''} ${group.artist}`,
        relevance: graded([
          [record, 3],
          ...group.records.slice(1, 3).map((item, index) => [item, Math.max(1, 2 - index)] as [SimulatedResourceRecord, number]),
        ]),
      };
    },
  });

  appendGroupQueries(queries, groups, {
    category: 'multi_term',
    limit: 18,
    build: (group) => ({
      text: `${group.artist} ${group.album}`,
      relevance: topGraded(group, 5),
    }),
  });

  appendGroupQueries(queries, aliasGroups, {
    category: 'release_alias',
    limit: 10,
    build: (group) => {
      if (!group.releaseAlias) return null;
      return {
        text: group.releaseAlias,
        relevance: topGraded(group, 5),
      };
    },
  });

  appendGroupQueries(queries, aliasGroups, {
    category: 'artist_alias',
    limit: 10,
    build: (group) => {
      if (!group.artistAlias) return null;
      return {
        text: group.artistAlias,
        relevance: topGraded(group, 4),
      };
    },
  });

  appendGroupQueries(queries, typoGroups, {
    category: 'typo',
    limit: 12,
    build: (group) => {
      const record = findRecord(group, 0);
      return {
        text: makeTypo(record.title),
        relevance: graded([[record, 3]]),
      };
    },
  });

  appendGroupQueries(queries, spacedTitleGroups, {
    category: 'compact',
    limit: 10,
    build: (group) => {
      const record = findRecord(group, 0);
      return {
        text: removeSpaces(record.title),
        relevance: graded([[record, 3]]),
      };
    },
  });

  appendGroupQueries(queries, cjkGroups, {
    category: 'fullwidth',
    limit: 4,
    build: (group) => ({
      text: toFullWidth(group.album),
      relevance: topGraded(group, 4),
    }),
  });

  const identityRecords = groups.flatMap((group) => group.records).slice(0, 30);
  for (const record of identityRecords.slice(0, 3)) {
    pushQuery(queries, 'token_id', record.tokenId ?? '', graded([[record, 3]]));
  }
  for (const record of identityRecords.slice(3, 6)) {
    pushQuery(queries, 'address', record.musicAssetAddress ?? '', graded([[record, 3]]));
  }
  for (const record of identityRecords.slice(6, 9)) {
    pushQuery(queries, 'cid', record.audioStorageObject?.cid ?? '', graded([[record, 3]]));
  }
  for (const record of identityRecords.slice(9, 12)) {
    pushQuery(queries, 'resource_key', buildResourceKey(record), graded([[record, 3]]));
  }
  for (const record of identityRecords.slice(12, 14)) {
    pushQuery(queries, 'tx_hash', (record.publishTxHash ?? '').slice(0, 20), graded([[record, 3]]));
  }

  return queries;
}

function countByCategory(queries: ExperimentQuery[]) {
  const counts = new Map<string, number>();
  for (const query of queries) {
    counts.set(query.category, (counts.get(query.category) ?? 0) + 1);
  }
  return counts;
}

function buildScalePlan(input: {
  queries: ExperimentQuery[];
  corpus: SimulationCorpus;
  datasetProfile: DatasetProfile;
}) {
  const counts = countByCategory(input.queries);
  const identityCategories = new Set(['token_id', 'address', 'cid', 'resource_key', 'tx_hash']);
  const queryById = new Map(input.queries.map((query) => [query.id, query]));
  const groupByKey = new Map(input.corpus.groups.map((group) => [group.key, group]));

  const queryPlan: AnnotationQueryPlan[] = input.queries.map((query) => {
    const relevantId = Object.entries(query.relevance)
      .sort((left, right) => right[1] - left[1])[0]?.[0];

    const anchorRecord = relevantId
      ? input.corpus.records.find((record) => record.id === relevantId)
      : null;
    const groupKey = anchorRecord?.simulation.groupKey ?? 'unknown';
    const group = groupByKey.get(groupKey);
    const annotationMode = identityCategories.has(query.category) ? 'spot_check' : 'manual';
    const poolDepth = annotationMode === 'spot_check' ? 5 : 10;

    return {
      query_id: query.id,
      category: query.category,
      text: query.text,
      annotation_mode: annotationMode,
      pool_depth: poolDepth,
      relevant_group_key: groupKey,
      relevant_group_label: group ? `${group.artist} / ${group.album}` : 'unknown',
    };
  });

  const categoryPlan = [...counts.entries()]
    .map(([category, queryCount]) => {
      const annotationMode = identityCategories.has(category) ? 'spot_check' : 'manual';
      const poolDepth = annotationMode === 'spot_check' ? 5 : 10;
      return {
        category,
        annotation_mode: annotationMode,
        query_count: queryCount,
        pool_depth: poolDepth,
        estimated_judgements: queryCount * poolDepth,
      } as const;
    })
    .sort((left, right) => left.category.localeCompare(right.category));

  const manualQueryCount = queryPlan.filter((item) => item.annotation_mode === 'manual').length;
  const spotCheckQueryCount = queryPlan.filter((item) => item.annotation_mode === 'spot_check').length;
  const autoLabelQueryCount = queryPlan.filter((item) => item.annotation_mode === 'auto_label').length;
  const estimatedManualJudgements = categoryPlan
    .filter((item) => item.annotation_mode === 'manual')
    .reduce((sum, item) => sum + item.estimated_judgements, 0);
  const estimatedTotalJudgements = categoryPlan.reduce((sum, item) => sum + item.estimated_judgements, 0);

  const corpusSize = input.datasetProfile.corpus_record_count;
  const latencyCandidateTiers = [
    Math.min(1_000, corpusSize),
    Math.min(5_000, corpusSize),
    Math.min(10_000, corpusSize),
    corpusSize,
  ].filter((value, index, values) => value > 0 && values.indexOf(value) === index);

  return {
    benchmark_label: input.datasetProfile.source_label,
    main_corpus_target: input.datasetProfile.corpus_record_count,
    latency_candidate_tiers: latencyCandidateTiers,
    manual_query_count: manualQueryCount,
    spot_check_query_count: spotCheckQueryCount,
    auto_label_query_count: autoLabelQueryCount,
    estimated_manual_judgements: estimatedManualJudgements,
    estimated_total_judgements: estimatedTotalJudgements,
    category_plan: categoryPlan,
    query_plan: queryPlan,
  } satisfies ExperimentScalePlan;
}

function toSourceStats(profile: MusicbrainzProfileRow) {
  return {
    total_artists: profile.total_artists,
    total_artist_aliases: profile.total_artist_aliases,
    total_releases: profile.total_releases,
    total_release_aliases: profile.total_release_aliases,
    total_release_groups: profile.total_release_groups,
    total_recordings: profile.total_recordings,
    total_tracks: profile.total_tracks,
    total_media: profile.total_media,
    releases_with_alias: profile.releases_with_alias,
    artists_with_alias: profile.artists_with_alias,
  } satisfies Record<string, number>;
}

/**
 * 该函数负责从 MusicBrainz 样本库构造新的离线检索基准。
 * 设计原则是：
 * 1. 相关样本来自真实发行簇，便于做可解释的人工标注；
 * 2. 干扰项来自整库抽样，保证候选规模不再停留在几十条；
 * 3. 链上身份字段继续通过确定性映射生成，以便沿用线上排序器。
 */
export async function buildMusicbrainzBenchmark(
  source: MusicbrainzSource,
  progress?: ProgressTask,
) {
  const profile = await source.readProfile();
  progress?.tick('读取样本库画像');
  const coreGroupRows = await source.readCoreGroups({
    minTracksPerRelease: CORE_GROUP_MIN_TRACKS,
    maxTracksPerRelease: CORE_GROUP_MAX_TRACKS,
    limit: CORE_GROUP_LIMIT,
  });
  progress?.tick('筛选核心发行簇');

  const coreReleaseIds = coreGroupRows.map((item) => item.release_id);
  const coreTrackRows = await source.readCoreTracks(coreReleaseIds);
  progress?.tick('装载核心相关曲目');
  const { groups, records: coreRecords } = buildCoreGroups(coreGroupRows, coreTrackRows);
  progress?.tick('构造核心语料');

  const distractorTarget = Math.max(0, TARGET_CORPUS_SIZE - coreRecords.length);
  const distractorTrackRows = await source.readDistractorTracks({
    excludedReleaseIds: coreReleaseIds,
    targetCount: distractorTarget,
  });
  progress?.tick('抽取干扰项');
  const distractorRecords = buildDistractorRecords(distractorTrackRows, coreRecords.length);

  const records = [...coreRecords, ...distractorRecords];
  const groupsByKey = Object.fromEntries(groups.map((group) => [group.key, group])) as Record<string, SimulationGroup>;
  const corpus = {
    records,
    groups,
    groupsByKey,
  } satisfies SimulationCorpus;

  const queries = buildQueries(groups);
  const datasetProfile = {
    source_key: 'musicbrainz_sample_20260401',
    source_label: 'MusicBrainz sample 2026-04-01',
    imported_track_count: profile.total_tracks,
    imported_release_count: profile.total_releases,
    imported_artist_count: profile.total_artists,
    core_group_count: groups.length,
    core_record_count: coreRecords.length,
    distractor_record_count: distractorRecords.length,
    corpus_record_count: records.length,
    query_count: queries.length,
  } satisfies DatasetProfile;

  progress?.tick('生成查询与规模规划');

  return {
    sourceStats: toSourceStats(profile),
    datasetProfile,
    scalePlan: buildScalePlan({ queries, corpus, datasetProfile }),
    corpus,
    queries,
  };
}
