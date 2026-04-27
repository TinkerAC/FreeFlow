import { buildReleaseResourceKey } from '../../modules/resources/resource.repository.js';
import { normalizeChainSearchQuery } from '../../modules/resources/resource.ranking.shared.js';
import { parseSqliteDate, type SeedLibrary } from './seed-library.js';
import type {
  ExperimentQuery,
  SeedTrackRow,
  SimulatedResourceRecord,
  SimulationCorpus,
  SimulationGroup,
  SimulationGroupDefinition,
} from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}]+/u;
const TOKEN_COMPACT_PATTERN = /[^\p{L}\p{N}]+/gu;

export const NOW = new Date('2026-04-22T12:00:00.000Z');
export const PLATFORM_HUB_ADDRESS = '0x00000000000000000000000000000000ff11aa22';

const GROUP_DEFINITIONS: SimulationGroupDefinition[] = [
  { key: 'witcher3', artist: 'Marcin Przybyłowicz', album: 'The Witcher 3: Wild Hunt (Soundtrack)', limit: 4, genreLabel: 'fantasy soundtrack', descriptionHint: 'open world fantasy score' },
  { key: 'stardew', artist: 'ConcernedApe', album: 'Stardew Valley Original Soundtrack', limit: 4, genreLabel: 'pastoral soundtrack', descriptionHint: 'farm life soundtrack' },
  { key: 'hollow_knight', artist: 'Christopher Larkin', album: 'Hollow Knight (Original Soundtrack)', limit: 4, genreLabel: 'ambient soundtrack', descriptionHint: 'dream cavern atmosphere' },
  { key: 'plants_vs_zombies', artist: 'Laura Shigihara', album: 'Plants Vs. Zombies (Original Video Game Soundtrack)', limit: 4, genreLabel: 'arcade soundtrack', descriptionHint: 'garden defense soundtrack' },
  { key: 'celeste_farewell', artist: 'Lena Raine', album: 'Celeste: Farewell (Original Soundtrack)', limit: 4, genreLabel: 'ambient electronic', descriptionHint: 'climbing farewell theme' },
  { key: 'undertale', artist: 'Toby Fox', album: 'UNDERTALE Soundtrack', limit: 4, genreLabel: 'chiptune soundtrack', descriptionHint: 'retro battle soundtrack' },
  { key: 'interstellar', artist: 'Hans Zimmer', album: 'Interstellar (Original Motion Picture Soundtrack) [Expanded Edition]', limit: 4, genreLabel: 'cinematic orchestral', descriptionHint: 'space mission organ score' },
  { key: 'jj_lin', artist: '林俊杰', album: '新地球 - 人 (Special Edition)', limit: 4, genreLabel: 'mandopop anthem', descriptionHint: 'urban mandopop vocal' },
  { key: 'joker_xue', artist: '薛之谦', album: '尘', limit: 4, genreLabel: 'mandopop ballad', descriptionHint: 'melancholic mandopop ballad' },
  { key: 'liu_yuning', artist: '摩登兄弟刘宇宁', album: '十', limit: 4, genreLabel: 'mandopop vocal', descriptionHint: 'modern mandopop vocal' },
  { key: 'slay_the_spire', artist: 'Clark Aboud', album: 'Slay the Spire (Original Soundtrack)', limit: 4, genreLabel: 'roguelike soundtrack', descriptionHint: 'deckbuilding roguelike score' },
  { key: 'terraria', artist: 'Re-Logic', album: 'Terraria, Vol. 4 (Original Soundtrack)', limit: 4, genreLabel: 'sandbox soundtrack', descriptionHint: 'sandbox exploration theme' },
  { key: 'minecraft_caves', artist: 'Lena Raine/Minecraft', album: 'Minecraft: Caves & Cliffs (Original Game Soundtrack)', limit: 4, genreLabel: 'voxel ambient', descriptionHint: 'cave exploration ambient' },
  { key: 'minecraft_beta', artist: 'C418', album: 'Minecraft - Volume Beta', limit: 4, genreLabel: 'minimal game ambient', descriptionHint: 'voxel minimal ambience' },
];

const TITLE_QUERY_GROUP_KEYS = ['witcher3', 'stardew', 'hollow_knight', 'plants_vs_zombies', 'celeste_farewell', 'undertale', 'interstellar', 'jj_lin', 'joker_xue', 'liu_yuning', 'slay_the_spire', 'terraria'] as const;
const ARTIST_QUERY_GROUP_KEYS = ['witcher3', 'stardew', 'hollow_knight', 'plants_vs_zombies', 'celeste_farewell', 'undertale', 'interstellar', 'jj_lin', 'joker_xue', 'liu_yuning'] as const;
const ALBUM_QUERY_GROUP_KEYS = ['witcher3', 'stardew', 'hollow_knight', 'plants_vs_zombies', 'celeste_farewell', 'undertale', 'interstellar', 'jj_lin', 'slay_the_spire', 'minecraft_beta'] as const;
const GENRE_QUERY_GROUP_KEYS = ['witcher3', 'stardew', 'hollow_knight', 'plants_vs_zombies', 'celeste_farewell', 'undertale', 'interstellar', 'jj_lin'] as const;

function normalizeText(value: string | null | undefined) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value: string) {
  return value.replace(TOKEN_COMPACT_PATTERN, '');
}

function tokenize(value: string) {
  return value
    .split(TOKEN_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  return normalizeText(value).replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function makeCid(kind: string, slug: string, index: number) {
  const serial = index.toString(36).replace(/[0189]/g, 'a');
  const body = `${kind}${sanitizeSlug(slug)}${serial}simset`
    .toLowerCase()
    .replace(/[^a-z2-7]/g, 'a')
    .padEnd(34, 'a')
    .slice(0, 34);
  return `bafy${body}`;
}

function escapeSql(value: string) {
  return value.replace(/'/g, "''");
}

function toFullWidth(value: string) {
  return [...value].map((char) => {
    if (char === ' ') return '　';
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248);
    return char;
  }).join('');
}

export function removeSpaces(value: string | null | undefined) {
  return String(value ?? '').replace(/\s+/g, '');
}

/**
 * 这里故意制造“接近但不完全正确”的拼写，
 * 用来测试模糊匹配与相似度打分的收益。
 */
export function makeTypo(value: string | null | undefined) {
  const normalized = String(value ?? '');
  if (normalized.includes('Scattered')) return normalized.replace('Scattered', 'Scatterd');
  if (normalized.includes('Battle')) return normalized.replace('Hero', 'Heroo');
  if (normalized.includes('Day One')) return normalized.replace('Demo', 'Demoo');
  if (normalized.includes('Merchants')) return normalized.replace('Novigrad', 'Novigard');
  if (normalized.includes('Journey')) return normalized.replace('Outlaw', 'Outlaaw');
  return normalized.length > 4 ? `${normalized.slice(0, -1)}x` : `${normalized}x`;
}

function buildDescription(row: SeedTrackRow, group: SimulationGroupDefinition) {
  return [
    `${group.descriptionHint} simulation sample`,
    `${row.artist} / ${row.album}`,
    `${row.platform} metadata`,
  ].join(' | ');
}

function deriveEngagement(row: SeedTrackRow, groupRank: number) {
  const bonus = Math.max(0, 5 - groupRank);
  const jitterA = Math.floor(seededFraction(`${row.id}:comments`) * 3);
  const jitterB = Math.floor(seededFraction(`${row.id}:purchases`) * 4);

  return {
    comments: Math.min(24, 4 + bonus * 4 + jitterA),
    purchases: Math.min(28, 5 + bonus * 5 + jitterB),
  };
}

function graded(entries: Array<[SimulatedResourceRecord, number]>) {
  return Object.fromEntries(entries.map(([record, grade]) => [record.id, grade]));
}

function topGraded(group: SimulationGroup, limit = 3) {
  return graded(
    group.records
      .slice(0, limit)
      .map((record, index) => [record, Math.max(1, 3 - index)]),
  );
}

function getGroup(groupsByKey: Record<string, SimulationGroup>, key: string) {
  const group = groupsByKey[key];
  if (!group) {
    throw new Error(`未找到实验分组 ${key}`);
  }
  return group;
}

function getRecord(group: SimulationGroup, index: number) {
  const record = group.records[index];
  if (!record) {
    throw new Error(`分组 ${group.key} 缺少第 ${index + 1} 条实验记录。`);
  }
  return record;
}

function pushQuery(
  queries: ExperimentQuery[],
  category: string,
  text: string,
  relevance: Record<string, number>,
) {
  const id = `q${String(queries.length + 1).padStart(2, '0')}`;
  queries.push({ id, category, text, relevance });
}

function fetchRowsForGroup(seedLibrary: SeedLibrary, group: SimulationGroupDefinition) {
  const sql = `
    select
      id,
      platform,
      platform_unique_id,
      title,
      artist,
      album,
      duration,
      played_count,
      created_at,
      modified_at
    from track
    where lower(platform) in ('neteasecloudmusic', 'qqmusic', 'youtubemusic')
      and trim(coalesce(title, '')) != ''
      and trim(coalesce(artist, '')) != ''
      and trim(coalesce(album, '')) != ''
      and duration between 60 and 900
      and artist = '${escapeSql(group.artist)}'
      and album = '${escapeSql(group.album)}'
    order by played_count desc, modified_at desc, id asc
    limit ${group.limit};
  `;

  const rows = seedLibrary.runJsonQuery<SeedTrackRow>(sql);
  if (rows.length < group.limit) {
    throw new Error(`分组 ${group.key} 的种子曲目不足，期望 ${group.limit} 条，实际 ${rows.length} 条。`);
  }
  return rows;
}

/**
 * 该统计用于论文里说明“实验并不是凭空造数据”，
 * 而是从现有曲库里抽取真实的艺术家 / 专辑簇作为种子。
 */
export function extractSourceStats(seedLibrary: SeedLibrary) {
  const [stats] = seedLibrary.runJsonQuery<Record<string, number>>(`
    select
      count(*) as total_seed_rows,
      sum(case when lower(platform) != 'hifini' then 1 else 0 end) as total_non_hifini_rows,
      sum(case when lower(platform) != 'hifini'
        and trim(coalesce(title, '')) != ''
        and trim(coalesce(artist, '')) != ''
        and trim(coalesce(album, '')) != ''
        and duration > 0
      then 1 else 0 end) as complete_rows,
      count(distinct case when lower(platform) != 'hifini' and trim(coalesce(artist, '')) != '' then artist end) as distinct_artists,
      count(distinct case when lower(platform) != 'hifini' and trim(coalesce(album, '')) != '' then album end) as distinct_albums
    from track;
  `);

  return stats ?? {};
}

/**
 * 构造模拟语料的关键点：
 * 1. 每个分组来源于真实曲库中的同专辑曲目；
 * 2. 链上字段、CID、热度与发布时间通过确定性规则生成；
 * 3. 同一份输入总能生成同一份实验集，保证论文可复现。
 */
export function buildSimulationCorpus(seedLibrary: SeedLibrary): SimulationCorpus {
  const groups: Array<SimulationGroupDefinition & { rows: SeedTrackRow[] }> = [];
  const flatRows: Array<{ row: SeedTrackRow; group: SimulationGroupDefinition; groupRank: number }> = [];

  for (const definition of GROUP_DEFINITIONS) {
    const rows = fetchRowsForGroup(seedLibrary, definition);
    groups.push({ ...definition, rows });
    flatRows.push(...rows.map((row, index) => ({ row, group: definition, groupRank: index + 1 })));
  }

  const globalRecency = [...flatRows]
    .sort((left, right) => {
      const rightTime = parseSqliteDate(right.row.modified_at, NOW).getTime();
      const leftTime = parseSqliteDate(left.row.modified_at, NOW).getTime();
      return rightTime - leftTime;
    })
    .map((entry, index) => ({ ...entry, recencyRank: index }));

  const recencyMap = new Map(globalRecency.map((entry) => [entry.row.id, entry.recencyRank]));
  let recordIndex = 0;

  const records: SimulatedResourceRecord[] = groups.flatMap((group, groupIndex) => {
    return group.rows.map((row, rowIndex) => {
      const index = ++recordIndex;
      const recencyRank = recencyMap.get(row.id) ?? index;

      // 让发布时间既受分组影响，也受原始“最近活跃度”影响，
      // 从而让时效性特征既有规律，也不会完全人工僵硬。
      const ageDays =
        10 +
        groupIndex * 7 +
        rowIndex * 3 +
        Math.floor(seededFraction(`${row.id}:age`) * 5) +
        Math.floor(recencyRank / 8);

      const publishedAt = new Date(NOW.getTime() - ageDays * DAY_MS);
      const updatedAt = new Date(publishedAt.getTime() + (10 + rowIndex * 3) * 60 * 60 * 1000);
      const createdAt = new Date(publishedAt.getTime() - (2 + rowIndex) * DAY_MS);
      const engagement = deriveEngagement(row, rowIndex + 1);

      return {
        id: `track-${String(index).padStart(3, '0')}`,
        title: row.title,
        artistName: row.artist,
        albumName: row.album,
        genreLabel: group.genreLabel,
        description: buildDescription(row, group),
        chainId: 11155111,
        musicAssetAddress: makeAddress(40_000 + index),
        platformHubAddress: PLATFORM_HUB_ADDRESS,
        tokenId: String(1_500 + index),
        publishTxHash: makeHash(180_000 + index),
        audioStorageObject: { cid: makeCid('audio', `${row.title}${row.artist}`, index) },
        coverStorageObject: { cid: makeCid('cover', `${row.album}${row.artist}`, index) },
        metadataStorageObject: { cid: makeCid('meta', `${row.title}${row.album}`, index) },
        _count: engagement,
        createdAt,
        updatedAt,
        publishedAt,
        simulation: {
          groupKey: group.key,
          groupRank: rowIndex + 1,
          seedTrackId: row.id,
          seedPlatform: row.platform,
          seedPlayedCount: Number(row.played_count ?? 0),
        },
      };
    });
  });

  const groupsByKey = Object.fromEntries(
    groups.map((group) => {
      const groupRecords = records.filter((record) => record.simulation.groupKey === group.key);
      return [
        group.key,
        {
          ...group,
          records: groupRecords,
        } satisfies SimulationGroup,
      ];
    }),
  ) as Record<string, SimulationGroup>;

  return {
    records,
    groups: Object.values(groupsByKey),
    groupsByKey,
  };
}

/**
 * 查询集覆盖标题、歌手、专辑、流派、地址、CID、资源键、错拼等场景，
 * 这样论文里的评估结果能更真实地反映搜索系统的综合能力。
 */
export function buildQueries(groupsByKey: Record<string, SimulationGroup>) {
  const queries: ExperimentQuery[] = [];

  for (const key of TITLE_QUERY_GROUP_KEYS) {
    const group = getGroup(groupsByKey, key);
    const record = getRecord(group, 0);
    pushQuery(queries, 'title_exact', record.title ?? '', graded([[record, 3]]));
  }

  for (const key of ARTIST_QUERY_GROUP_KEYS) {
    const group = getGroup(groupsByKey, key);
    pushQuery(queries, 'artist', group.artist, topGraded(group));
  }

  for (const key of ALBUM_QUERY_GROUP_KEYS) {
    const group = getGroup(groupsByKey, key);
    pushQuery(queries, 'album', group.album, topGraded(group));
  }

  for (const key of GENRE_QUERY_GROUP_KEYS) {
    const group = getGroup(groupsByKey, key);
    pushQuery(queries, 'genre', group.genreLabel, topGraded(group));
  }

  const identityPool = [
    getRecord(getGroup(groupsByKey, 'witcher3'), 1),
    getRecord(getGroup(groupsByKey, 'celeste_farewell'), 0),
    getRecord(getGroup(groupsByKey, 'jj_lin'), 0),
  ];
  for (const record of identityPool) {
    pushQuery(queries, 'token_id', record.tokenId ?? '', graded([[record, 3]]));
  }

  const interstellarRecord = getRecord(getGroup(groupsByKey, 'interstellar'), 0);
  const minecraftBetaRecord = getRecord(getGroup(groupsByKey, 'minecraft_beta'), 2);
  pushQuery(queries, 'address', interstellarRecord.musicAssetAddress ?? '', graded([[interstellarRecord, 3]]));
  pushQuery(queries, 'address', minecraftBetaRecord.musicAssetAddress ?? '', graded([[minecraftBetaRecord, 3]]));

  const stardewRecord = getRecord(getGroup(groupsByKey, 'stardew'), 0);
  const spireRecord = getRecord(getGroup(groupsByKey, 'slay_the_spire'), 1);
  pushQuery(queries, 'cid', stardewRecord.audioStorageObject?.cid ?? '', graded([[stardewRecord, 3]]));
  pushQuery(queries, 'cid', spireRecord.metadataStorageObject?.cid ?? '', graded([[spireRecord, 3]]));

  const hollowKnightRecord = getRecord(getGroup(groupsByKey, 'hollow_knight'), 0);
  const terrariaRecord = getRecord(getGroup(groupsByKey, 'terraria'), 1);
  pushQuery(queries, 'resource_key', buildResourceKey(hollowKnightRecord), graded([[hollowKnightRecord, 3]]));
  pushQuery(queries, 'resource_key', buildResourceKey(terrariaRecord), graded([[terrariaRecord, 3]]));

  const undertaleTxRecord = getRecord(getGroup(groupsByKey, 'undertale'), 1);
  pushQuery(
    queries,
    'tx_hash',
    (undertaleTxRecord.publishTxHash ?? '').slice(0, 20),
    graded([[undertaleTxRecord, 3]]),
  );

  const typoPool = [
    getRecord(getGroup(groupsByKey, 'witcher3'), 0),
    getRecord(getGroup(groupsByKey, 'celeste_farewell'), 1),
    getRecord(getGroup(groupsByKey, 'undertale'), 0),
    getRecord(getGroup(groupsByKey, 'interstellar'), 0),
    getRecord(getGroup(groupsByKey, 'stardew'), 2),
  ];
  for (const record of typoPool) {
    pushQuery(queries, 'typo', makeTypo(record.title), graded([[record, 3]]));
  }

  const witcherRecord = getRecord(getGroup(groupsByKey, 'witcher3'), 0);
  const jjLinRecord = getRecord(getGroup(groupsByKey, 'jj_lin'), 0);
  const interstellarCompactRecord = getRecord(getGroup(groupsByKey, 'interstellar'), 0);
  const undertaleCompactRecord = getRecord(getGroup(groupsByKey, 'undertale'), 0);
  pushQuery(queries, 'compact', removeSpaces(witcherRecord.title), graded([[witcherRecord, 3]]));
  pushQuery(queries, 'compact', '新 地球', graded([[jjLinRecord, 3]]));
  pushQuery(queries, 'compact', removeSpaces(interstellarCompactRecord.title), graded([[interstellarCompactRecord, 3]]));
  pushQuery(queries, 'compact', removeSpaces(undertaleCompactRecord.title), graded([[undertaleCompactRecord, 3]]));

  const hollowKnightFullWidthRecord = getRecord(getGroup(groupsByKey, 'hollow_knight'), 1);
  pushQuery(queries, 'fullwidth', toFullWidth(hollowKnightFullWidthRecord.title ?? ''), graded([[hollowKnightFullWidthRecord, 3]]));

  const interstellarGroup = getGroup(groupsByKey, 'interstellar');
  pushQuery(
    queries,
    'description',
    interstellarGroup.descriptionHint,
    graded([
      [getRecord(interstellarGroup, 0), 3],
      [getRecord(interstellarGroup, 1), 2],
      [getRecord(interstellarGroup, 2), 1],
    ]),
  );

  const undertaleGroup = getGroup(groupsByKey, 'undertale');
  pushQuery(queries, 'multi_term', 'Toby Fox UNDERTALE soundtrack', topGraded(undertaleGroup));

  return queries;
}

export function buildResourceKey(record: SimulatedResourceRecord) {
  return buildReleaseResourceKey({
    chainId: record.chainId,
    musicAssetAddress: record.musicAssetAddress,
    tokenId: record.tokenId,
  }) ?? record.id;
}

export function validateInputs(records: SimulatedResourceRecord[], queries: ExperimentQuery[]) {
  const recordIds = new Set(records.map((record) => record.id));
  for (const query of queries) {
    for (const recordId of Object.keys(query.relevance)) {
      if (!recordIds.has(recordId)) {
        throw new Error(`查询 ${query.id} 引用了不存在的记录 ${recordId}`);
      }
    }
  }
}

/**
 * 该函数只用于生成说明性文本，不参与排序打分。
 * 把查询先走一遍正式的归一化逻辑，是为了保证实验数据集描述和排序输入一致。
 */
export function explainNormalizedQuery(raw: string) {
  const query = normalizeChainSearchQuery(raw);
  return {
    normalized: query.normalized,
    compact: query.compact,
    token_count: tokenize(query.normalized).length,
  };
}
