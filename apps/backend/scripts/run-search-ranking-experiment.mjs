#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  normalizeChainSearchQuery,
  rankResourceRecords,
} from '../dist/modules/resources/resource.ranking.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const figuresDataDir = resolve(repoRoot, 'papers/Latex-Mine/figures/data');
const experimentOutDir = resolve(repoRoot, 'papers/Latex-Mine/out/experiments');

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_HALF_LIFE_DAYS = 45;
const TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}]+/u;
const TOKEN_COMPACT_PATTERN = /[^\p{L}\p{N}]+/gu;
const NOW = new Date('2026-04-22T12:00:00.000Z');
const PLATFORM_HUB_ADDRESS = '0x00000000000000000000000000000000ff11aa22';

const GROUP_DEFINITIONS = [
  {
    key: 'witcher3',
    artist: 'Marcin Przybyłowicz',
    album: 'The Witcher 3: Wild Hunt (Soundtrack)',
    limit: 4,
    genreLabel: 'fantasy soundtrack',
    descriptionHint: 'open world fantasy score',
  },
  {
    key: 'stardew',
    artist: 'ConcernedApe',
    album: 'Stardew Valley Original Soundtrack',
    limit: 4,
    genreLabel: 'pastoral soundtrack',
    descriptionHint: 'farm life soundtrack',
  },
  {
    key: 'hollow_knight',
    artist: 'Christopher Larkin',
    album: 'Hollow Knight (Original Soundtrack)',
    limit: 4,
    genreLabel: 'ambient soundtrack',
    descriptionHint: 'dream cavern atmosphere',
  },
  {
    key: 'plants_vs_zombies',
    artist: 'Laura Shigihara',
    album: 'Plants Vs. Zombies (Original Video Game Soundtrack)',
    limit: 4,
    genreLabel: 'arcade soundtrack',
    descriptionHint: 'garden defense soundtrack',
  },
  {
    key: 'celeste_farewell',
    artist: 'Lena Raine',
    album: 'Celeste: Farewell (Original Soundtrack)',
    limit: 4,
    genreLabel: 'ambient electronic',
    descriptionHint: 'climbing farewell theme',
  },
  {
    key: 'undertale',
    artist: 'Toby Fox',
    album: 'UNDERTALE Soundtrack',
    limit: 4,
    genreLabel: 'chiptune soundtrack',
    descriptionHint: 'retro battle soundtrack',
  },
  {
    key: 'interstellar',
    artist: 'Hans Zimmer',
    album: 'Interstellar (Original Motion Picture Soundtrack) [Expanded Edition]',
    limit: 4,
    genreLabel: 'cinematic orchestral',
    descriptionHint: 'space mission organ score',
  },
  {
    key: 'jj_lin',
    artist: '林俊杰',
    album: '新地球 - 人 (Special Edition)',
    limit: 4,
    genreLabel: 'mandopop anthem',
    descriptionHint: 'urban mandopop vocal',
  },
  {
    key: 'joker_xue',
    artist: '薛之谦',
    album: '尘',
    limit: 4,
    genreLabel: 'mandopop ballad',
    descriptionHint: 'melancholic mandopop ballad',
  },
  {
    key: 'liu_yuning',
    artist: '摩登兄弟刘宇宁',
    album: '十',
    limit: 4,
    genreLabel: 'mandopop vocal',
    descriptionHint: 'modern mandopop vocal',
  },
  {
    key: 'slay_the_spire',
    artist: 'Clark Aboud',
    album: 'Slay the Spire (Original Soundtrack)',
    limit: 4,
    genreLabel: 'roguelike soundtrack',
    descriptionHint: 'deckbuilding roguelike score',
  },
  {
    key: 'terraria',
    artist: 'Re-Logic',
    album: 'Terraria, Vol. 4 (Original Soundtrack)',
    limit: 4,
    genreLabel: 'sandbox soundtrack',
    descriptionHint: 'sandbox exploration theme',
  },
  {
    key: 'minecraft_caves',
    artist: 'Lena Raine/Minecraft',
    album: 'Minecraft: Caves & Cliffs (Original Game Soundtrack)',
    limit: 4,
    genreLabel: 'voxel ambient',
    descriptionHint: 'cave exploration ambient',
  },
  {
    key: 'minecraft_beta',
    artist: 'C418',
    album: 'Minecraft - Volume Beta',
    limit: 4,
    genreLabel: 'minimal game ambient',
    descriptionHint: 'voxel minimal ambience',
  },
];

const TITLE_QUERY_GROUP_KEYS = [
  'witcher3',
  'stardew',
  'hollow_knight',
  'plants_vs_zombies',
  'celeste_farewell',
  'undertale',
  'interstellar',
  'jj_lin',
  'joker_xue',
  'liu_yuning',
  'slay_the_spire',
  'terraria',
];

const ARTIST_QUERY_GROUP_KEYS = [
  'witcher3',
  'stardew',
  'hollow_knight',
  'plants_vs_zombies',
  'celeste_farewell',
  'undertale',
  'interstellar',
  'jj_lin',
  'joker_xue',
  'liu_yuning',
];

const ALBUM_QUERY_GROUP_KEYS = [
  'witcher3',
  'stardew',
  'hollow_knight',
  'plants_vs_zombies',
  'celeste_farewell',
  'undertale',
  'interstellar',
  'jj_lin',
  'slay_the_spire',
  'minecraft_beta',
];

const GENRE_QUERY_GROUP_KEYS = [
  'witcher3',
  'stardew',
  'hollow_knight',
  'plants_vs_zombies',
  'celeste_farewell',
  'undertale',
  'interstellar',
  'jj_lin',
];

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value) {
  return value.replace(TOKEN_COMPACT_PATTERN, '');
}

function tokenize(value) {
  return value
    .split(TOKEN_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

function roundScore(value) {
  return Math.round(value * 1000) / 1000;
}

function buildResourceKey(record) {
  return `chain:${record.chainId}:${record.musicAssetAddress.toLowerCase()}:${record.tokenId}`;
}

function makeAddress(index) {
  return `0x${index.toString(16).padStart(40, '0')}`;
}

function makeHash(index) {
  return `0x${index.toString(16).padStart(64, '0')}`;
}

function sanitizeSlug(value) {
  return normalizeText(value).replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

function makeCid(kind, slug, index) {
  const serial = index.toString(36).replace(/[0189]/g, 'a');
  const body = `${kind}${sanitizeSlug(slug)}${serial}simset`
    .toLowerCase()
    .replace(/[^a-z2-7]/g, 'a')
    .padEnd(34, 'a')
    .slice(0, 34);
  return `bafy${body}`;
}

function escapeSql(value) {
  return String(value).replace(/'/g, "''");
}

function resolveSeedLibraryPath() {
  const candidates = [
    resolve(repoRoot, 'temp/database.sqlite'),
    resolve(repoRoot, 'Temp/database.sqlite'),
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error('Missing simulation seed library at temp/database.sqlite');
  }
  return found;
}

function runSqliteJson(sql) {
  const output = execFileSync('sqlite3', ['-json', resolveSeedLibraryPath(), sql], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return JSON.parse(output || '[]');
}

function parseSqliteDate(value) {
  const text = String(value ?? '').trim();
  if (!text) return new Date(NOW);

  let normalized = text.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)/, '$1T$2');
  normalized = normalized.replace(/\s+([+-]\d{2}:\d{2})$/, '$1');
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += 'Z';
  }
  return new Date(normalized);
}

function seededNumber(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededFraction(seed) {
  return seededNumber(seed) / 0xffffffff;
}

function toFullWidth(value) {
  return [...value].map((char) => {
    if (char === ' ') return '　';
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) return String.fromCharCode(code + 65248);
    return char;
  }).join('');
}

function removeSpaces(value) {
  return String(value ?? '').replace(/\s+/g, '');
}

function makeTypo(value) {
  const normalized = String(value ?? '');
  if (normalized.includes('Scattered')) return normalized.replace('Scattered', 'Scatterd');
  if (normalized.includes('Battle')) return normalized.replace('Hero', 'Heroo');
  if (normalized.includes('Day One')) return normalized.replace('Demo', 'Demoo');
  if (normalized.includes('Merchants')) return normalized.replace('Novigrad', 'Novigard');
  if (normalized.includes('Journey')) return normalized.replace('Outlaw', 'Outlaaw');
  return normalized.length > 4 ? `${normalized.slice(0, -1)}x` : `${normalized}x`;
}

function shortText(value, maxLength = 48) {
  const text = String(value ?? '').trim();
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

function buildDescription(row, group) {
  return [
    `${group.descriptionHint} simulation sample`,
    `${row.artist} / ${row.album}`,
    `${row.platform} metadata`,
  ].join(' | ');
}

function deriveEngagement(row, groupRank) {
  const bonus = Math.max(0, 5 - groupRank);
  const jitterA = Math.floor(seededFraction(`${row.id}:comments`) * 3);
  const jitterB = Math.floor(seededFraction(`${row.id}:purchases`) * 4);

  return {
    comments: Math.min(24, 4 + bonus * 4 + jitterA),
    purchases: Math.min(28, 5 + bonus * 5 + jitterB),
  };
}

function fetchRowsForGroup(group) {
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

  const rows = runSqliteJson(sql);
  if (rows.length < group.limit) {
    throw new Error(`Insufficient seed tracks for group ${group.key}: expected ${group.limit}, got ${rows.length}`);
  }
  return rows;
}

function extractSourceStats() {
  const [stats] = runSqliteJson(`
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

function buildSimulationCorpus() {
  const groups = [];
  const flatRows = [];

  for (const definition of GROUP_DEFINITIONS) {
    const rows = fetchRowsForGroup(definition);
    const group = { ...definition, rows };
    groups.push(group);
    flatRows.push(...rows.map((row, index) => ({ row, group, groupRank: index + 1 })));
  }

  const globalRecency = [...flatRows]
    .sort((left, right) => {
      const rightTime = parseSqliteDate(right.row.modified_at).getTime();
      const leftTime = parseSqliteDate(left.row.modified_at).getTime();
      return rightTime - leftTime;
    })
    .map((entry, index) => ({ ...entry, recencyRank: index }));

  const recencyMap = new Map(globalRecency.map((entry) => [entry.row.id, entry.recencyRank]));
  let recordIndex = 0;

  const records = groups.flatMap((group, groupIndex) => {
    return group.rows.map((row, rowIndex) => {
      const index = ++recordIndex;
      const recencyRank = recencyMap.get(row.id) ?? index;
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

  const groupsByKey = Object.fromEntries(groups.map((group) => [
    group.key,
    {
      ...group,
      records: records.filter((record) => record.simulation.groupKey === group.key),
    },
  ]));

  return { records, groupsByKey, groups };
}

function graded(entries) {
  return Object.fromEntries(entries.map(([record, grade]) => [record.id, grade]));
}

function topGraded(group, limit = 3) {
  return graded(
    group.records
      .slice(0, limit)
      .map((record, index) => [record, Math.max(1, 3 - index)]),
  );
}

function buildQueries(groupsByKey) {
  const queries = [];
  let counter = 1;

  const push = (category, text, relevance, options = {}) => {
    queries.push({
      id: `q${String(counter).padStart(2, '0')}`,
      category,
      text,
      relevance,
      ...options,
    });
    counter++;
  };

  for (const key of TITLE_QUERY_GROUP_KEYS) {
    const group = groupsByKey[key];
    push('title_exact', group.records[0].title, graded([[group.records[0], 3]]));
  }

  for (const key of ARTIST_QUERY_GROUP_KEYS) {
    const group = groupsByKey[key];
    push('artist', group.artist, topGraded(group));
  }

  for (const key of ALBUM_QUERY_GROUP_KEYS) {
    const group = groupsByKey[key];
    push('album', group.album, topGraded(group));
  }

  for (const key of GENRE_QUERY_GROUP_KEYS) {
    const group = groupsByKey[key];
    push('genre', group.genreLabel, topGraded(group));
  }

  const identityPool = [
    groupsByKey.witcher3.records[1],
    groupsByKey.celeste_farewell.records[0],
    groupsByKey.jj_lin.records[0],
  ];
  for (const record of identityPool) {
    push('token_id', record.tokenId, graded([[record, 3]]));
  }

  push('address', groupsByKey.interstellar.records[0].musicAssetAddress, graded([[groupsByKey.interstellar.records[0], 3]]));
  push('address', groupsByKey.minecraft_beta.records[2].musicAssetAddress, graded([[groupsByKey.minecraft_beta.records[2], 3]]));

  push('cid', groupsByKey.stardew.records[0].audioStorageObject.cid, graded([[groupsByKey.stardew.records[0], 3]]));
  push('cid', groupsByKey.slay_the_spire.records[1].metadataStorageObject.cid, graded([[groupsByKey.slay_the_spire.records[1], 3]]));

  push('resource_key', buildResourceKey(groupsByKey.hollow_knight.records[0]), graded([[groupsByKey.hollow_knight.records[0], 3]]));
  push('resource_key', buildResourceKey(groupsByKey.terraria.records[1]), graded([[groupsByKey.terraria.records[1], 3]]));

  push('tx_hash', groupsByKey.undertale.records[1].publishTxHash.slice(0, 20), graded([[groupsByKey.undertale.records[1], 3]]));

  const typoPool = [
    groupsByKey.witcher3.records[0],
    groupsByKey.celeste_farewell.records[1],
    groupsByKey.undertale.records[0],
    groupsByKey.interstellar.records[0],
    groupsByKey.stardew.records[2],
  ];
  for (const record of typoPool) {
    push('typo', makeTypo(record.title), graded([[record, 3]]));
  }

  push('compact', removeSpaces(groupsByKey.witcher3.records[0].title), graded([[groupsByKey.witcher3.records[0], 3]]));
  push('compact', '新 地球', graded([[groupsByKey.jj_lin.records[0], 3]]));
  push('compact', removeSpaces(groupsByKey.interstellar.records[0].title), graded([[groupsByKey.interstellar.records[0], 3]]));
  push('compact', removeSpaces(groupsByKey.undertale.records[0].title), graded([[groupsByKey.undertale.records[0], 3]]));

  push('fullwidth', toFullWidth(groupsByKey.hollow_knight.records[1].title), graded([[groupsByKey.hollow_knight.records[1], 3]]));

  push('description', groupsByKey.interstellar.descriptionHint, graded([[groupsByKey.interstellar.records[0], 3], [groupsByKey.interstellar.records[1], 2], [groupsByKey.interstellar.records[2], 1]]));

  push('multi_term', 'Toby Fox UNDERTALE soundtrack', topGraded(groupsByKey.undertale));

  return queries;
}

function validateInputs(records, queries) {
  for (const query of queries) {
    for (const recordId of Object.keys(query.relevance)) {
      if (!records.some((record) => record.id === recordId)) {
        throw new Error(`Unknown record reference "${recordId}" in ${query.id}`);
      }
    }
  }
}

function addScore(state, feature, score, reason, queryMatched = false) {
  if (!Number.isFinite(score) || score <= 0) return;
  state.score += score;
  state.features[feature] = roundScore((state.features[feature] ?? 0) + score);
  if (reason && !state.reasons.includes(reason)) state.reasons.push(reason);
  if (queryMatched) state.queryMatched = true;
}

function levenshtein(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i++) {
    current[0] = i;
    for (let j = 1; j <= right.length; j++) {
      const cost = left.charCodeAt(i - 1) === right.charCodeAt(j - 1) ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= right.length; j++) {
      previous[j] = current[j] ?? 0;
    }
  }

  return previous[right.length] ?? 0;
}

function normalizedSimilarity(left, right) {
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 0;
  return Math.max(0, 1 - levenshtein(left, right) / maxLength);
}

function tokenOverlap(queryTokens, fieldValue) {
  if (!queryTokens.length) return 0;
  const fieldTokens = new Set(tokenize(fieldValue));
  if (!fieldTokens.size) return 0;

  let hit = 0;
  for (const token of queryTokens) {
    if (fieldTokens.has(token)) hit++;
  }
  return hit / queryTokens.length;
}

function scoreTextField(state, query, value, field, label, weights) {
  const text = normalizeText(value);
  if (!query.normalized || !text) return;
  const compact = compactText(text);

  if (text === query.normalized || compact === query.compact) {
    addScore(state, `${field}.exact`, weights.exact, `${label}精确匹配`, true);
    return;
  }

  if (text.startsWith(query.normalized) || compact.startsWith(query.compact)) {
    addScore(state, `${field}.prefix`, weights.prefix, `${label}前缀匹配`, true);
  } else if (
    query.compact.length >= 2 &&
    (text.includes(query.normalized) || compact.includes(query.compact))
  ) {
    addScore(state, `${field}.contains`, weights.contains, `${label}包含关键词`, true);
  }

  const overlap = tokenOverlap(query.tokens, text);
  if (overlap > 0 && query.tokens.length > 1) {
    addScore(
      state,
      `${field}.token_overlap`,
      weights.token * overlap,
      `${label}分词命中 ${Math.round(overlap * 100)}%`,
      true,
    );
  }
}

function scoreIdentityFields(state, query, record) {
  if (!query.normalized) return;

  const resourceKey = buildResourceKey(record).toLowerCase();
  const tokenId = normalizeText(record.tokenId);
  const contractAddress = normalizeText(record.musicAssetAddress);
  const platformHubAddress = normalizeText(record.platformHubAddress);
  const publishTxHash = normalizeText(record.publishTxHash);
  const cids = [
    record.audioStorageObject?.cid,
    record.coverStorageObject?.cid,
    record.metadataStorageObject?.cid,
  ]
    .filter(Boolean)
    .map((cid) => cid.toLowerCase());

  if (query.resourceKey && resourceKey === query.resourceKey) {
    addScore(state, 'identity.resource_key_exact', 100, '链上资源键精确匹配', true);
  } else if (query.normalized.length >= 8 && resourceKey.includes(query.normalized)) {
    addScore(state, 'identity.resource_key_contains', 45, '链上资源键包含关键词', true);
  }

  if (query.tokenId && tokenId === query.tokenId) {
    addScore(state, 'identity.token_id_exact', 80, 'Token ID 精确匹配', true);
  } else if (query.normalized.length >= 2 && tokenId.startsWith(query.normalized)) {
    addScore(state, 'identity.token_id_prefix', 25, 'Token ID 前缀匹配', true);
  }

  if (query.address && contractAddress === query.address) {
    addScore(state, 'identity.contract_exact', 70, '音乐合约地址精确匹配', true);
  } else if (query.address && platformHubAddress === query.address) {
    addScore(state, 'identity.platform_hub_exact', 55, '平台合约地址精确匹配', true);
  } else if (query.address && contractAddress.includes(query.address.slice(2, 10))) {
    addScore(state, 'identity.contract_partial', 20, '音乐合约地址局部匹配', true);
  }

  if (query.normalized.length >= 8 && publishTxHash.includes(query.normalized)) {
    addScore(state, 'identity.publish_tx_hash', 45, '发布交易哈希匹配', true);
  }

  for (const cid of cids) {
    if (query.cid && cid === query.cid) {
      addScore(state, 'identity.cid_exact', 65, 'IPFS CID 精确匹配', true);
      break;
    }
    if (query.normalized.length >= 8 && cid.includes(query.normalized)) {
      addScore(state, 'identity.cid_contains', 30, 'IPFS CID 包含关键词', true);
      break;
    }
  }
}

function scoreTextSimilarity(state, query, record) {
  if (query.compact.length < 3) return;
  const queryText = query.compact.slice(0, 96);
  const fields = [
    record.title,
    [record.title, record.artistName].filter(Boolean).join(' '),
    record.artistName,
    record.albumName,
    record.genreLabel,
    record.description,
  ];

  let best = 0;
  for (const value of fields) {
    const text = compactText(normalizeText(value)).slice(0, 96);
    if (!text) continue;
    best = Math.max(best, normalizedSimilarity(queryText, text));
  }

  const threshold = query.compact.length <= 4 ? 0.78 : 0.68;
  if (best >= threshold) {
    addScore(
      state,
      'text.normalized_similarity',
      16 * best,
      `文本相似度 ${Math.round(best * 100)}%`,
      true,
    );
  }
}

function freshnessScore(record, now) {
  const date = record.publishedAt ?? record.updatedAt ?? record.createdAt;
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
}

function popularityScore(record) {
  const comments = record._count?.comments ?? 0;
  const purchases = record._count?.purchases ?? 0;
  const weighted = comments + purchases * 3;
  return Math.min(1, Math.log1p(weighted) / Math.log1p(30));
}

function rankWithConfig(recordsToRank, keyword, config, now = NOW) {
  const query = normalizeChainSearchQuery(keyword);
  const hasQuery = query.normalized.length > 0;

  return recordsToRank
    .map((record) => {
      const state = {
        score: 0,
        reasons: [],
        features: {},
        queryMatched: !hasQuery,
      };

      if (config.identity) {
        scoreIdentityFields(state, query, record);
      }
      if (config.text) {
        scoreTextField(state, query, record.title, 'text.title', '标题', {
          exact: 45,
          prefix: 30,
          contains: 20,
          token: 14,
        });
        scoreTextField(state, query, record.artistName, 'text.artist', '艺术家', {
          exact: 34,
          prefix: 24,
          contains: 16,
          token: 12,
        });
        scoreTextField(state, query, record.albumName, 'text.album', '专辑', {
          exact: 24,
          prefix: 16,
          contains: 10,
          token: 8,
        });
        scoreTextField(state, query, record.genreLabel, 'text.genre', '流派', {
          exact: 20,
          prefix: 14,
          contains: 8,
          token: 6,
        });
        scoreTextField(state, query, record.description, 'text.description', '描述', {
          exact: 10,
          prefix: 8,
          contains: 6,
          token: 4,
        });
      }
      if (config.fuzzy) {
        scoreTextSimilarity(state, query, record);
      }
      if (config.freshness) {
        const fresh = freshnessScore(record, now);
        addScore(
          state,
          'quality.freshness',
          8 * fresh,
          fresh > 0.85 || !hasQuery ? '最近发布优先' : null,
        );
      }
      if (config.popularity) {
        const popularity = popularityScore(record);
        addScore(
          state,
          'quality.popularity',
          7 * popularity,
          popularity > 0.15 ? '购买/评论热度较高' : null,
        );
      }

      return {
        record,
        score: roundScore(state.score),
        reasons: state.reasons.slice(0, 6),
        features: state.features,
        matched: state.queryMatched,
      };
    })
    .filter((item) => !hasQuery || item.matched)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const rightTime = (right.record.publishedAt ?? right.record.updatedAt).getTime();
      const leftTime = (left.record.publishedAt ?? left.record.updatedAt).getTime();
      return rightTime - leftTime;
    });
}

function matchesBaseline(record, keyword) {
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
    record.audioStorageObject?.cid,
    record.coverStorageObject?.cid,
    record.metadataStorageObject?.cid,
    buildResourceKey(record),
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value));

  return values.some((value) => value.includes(normalized.normalized));
}

function sqlContainsBaseline(recordsToRank, keyword) {
  return recordsToRank
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

function idsWithScores(results, limit = 10) {
  return results.slice(0, limit).map((item) => [item.record.id, item.score]);
}

function validateFullRankingParity(records, queries) {
  for (const query of queries) {
    const actual = idsWithScores(rankResourceRecords(records, query.text, NOW));
    const derived = idsWithScores(rankWithConfig(records, query.text, {
      text: true,
      fuzzy: true,
      identity: true,
      freshness: true,
      popularity: true,
    }));

    const actualSignature = JSON.stringify(actual);
    const derivedSignature = JSON.stringify(derived);
    if (actualSignature !== derivedSignature) {
      throw new Error(`Full ranking mismatch on ${query.id}: ${actualSignature} !== ${derivedSignature}`);
    }
  }
}

function precisionAtK(results, relevance, k) {
  const topK = results.slice(0, k);
  if (topK.length === 0) return 0;
  const relevant = topK.filter((item) => (relevance[item.record.id] ?? 0) > 0).length;
  return relevant / k;
}

function reciprocalRank(results, relevance) {
  const index = results.findIndex((item) => (relevance[item.record.id] ?? 0) > 0);
  return index === -1 ? 0 : 1 / (index + 1);
}

function dcgAtK(results, relevance, k) {
  return results.slice(0, k).reduce((sum, item, index) => {
    const grade = relevance[item.record.id] ?? 0;
    if (grade <= 0) return sum;
    return sum + (2 ** grade - 1) / Math.log2(index + 2);
  }, 0);
}

function ndcgAtK(results, relevance, k) {
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

function benchmarkAverageLatency(fn, iterations = 240) {
  for (let i = 0; i < 24; i++) fn();
  const startedAt = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return (performance.now() - startedAt) / iterations;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1));
  return sorted[index] ?? 0;
}

function buildMethods(records) {
  return [
    {
      key: 'sql_contains',
      label: 'SQL contains baseline',
      rank: (queryText, recordsToRank = records) => sqlContainsBaseline(recordsToRank, queryText),
    },
    {
      key: 'text_only',
      label: 'Text scoring only',
      rank: (queryText, recordsToRank = records) =>
        rankWithConfig(recordsToRank, queryText, {
          text: true,
          fuzzy: true,
          identity: false,
          freshness: false,
          popularity: false,
        }),
    },
    {
      key: 'text_identity',
      label: 'Text plus identity fields',
      rank: (queryText, recordsToRank = records) =>
        rankWithConfig(recordsToRank, queryText, {
          text: true,
          fuzzy: true,
          identity: true,
          freshness: false,
          popularity: false,
        }),
    },
    {
      key: 'full_ranker',
      label: 'Full chain_resource_rank_v1',
      rank: (queryText, recordsToRank = records) => rankResourceRecords(recordsToRank, queryText, NOW),
    },
  ];
}

function summarizeMethods(methods, queries) {
  return methods.map((method) => {
    let precisionTotal = 0;
    let mrrTotal = 0;
    let ndcgTotal = 0;
    let zeroResultCount = 0;
    const latencySamples = [];

    for (const query of queries) {
      const results = method.rank(query.text).slice(0, 10);
      precisionTotal += precisionAtK(results, query.relevance, 10);
      mrrTotal += reciprocalRank(results, query.relevance);
      ndcgTotal += ndcgAtK(results, query.relevance, 10);
      if (results.length === 0) zeroResultCount++;
      latencySamples.push(benchmarkAverageLatency(() => method.rank(query.text), 220));
    }

    const averageLatencyMs = latencySamples.reduce((sum, value) => sum + value, 0) / latencySamples.length;

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

function expandRecords(records, targetCount) {
  const pool = [];
  let cloneIndex = 0;

  while (pool.length < targetCount) {
    for (const record of records) {
      if (pool.length >= targetCount) break;

      const serial = pool.length + 1;
      const publishedAt = new Date(record.publishedAt.getTime() - cloneIndex * 90 * 60 * 1000);
      const updatedAt = new Date(record.updatedAt.getTime() - cloneIndex * 90 * 60 * 1000);
      const createdAt = new Date(record.createdAt.getTime() - cloneIndex * 90 * 60 * 1000);

      pool.push({
        ...record,
        id: `${record.id}-pool-${serial}`,
        tokenId: String(5_000 + serial),
        musicAssetAddress: makeAddress(80_000 + serial),
        publishTxHash: makeHash(280_000 + serial),
        audioStorageObject: { cid: makeCid('audio', `${record.id}${serial}`, serial) },
        coverStorageObject: { cid: makeCid('cover', `${record.id}${serial}`, serial) },
        metadataStorageObject: { cid: makeCid('meta', `${record.id}${serial}`, serial) },
        _count: {
          comments: (record._count.comments + serial) % 21,
          purchases: (record._count.purchases + serial) % 25,
        },
        publishedAt,
        updatedAt,
        createdAt,
      });
    }
    cloneIndex++;
  }

  return pool;
}

function summarizeLatency(records) {
  const queryTexts = [
    records[0].title,
    makeTypo(records[12].title),
    buildResourceKey(records[22]),
    records[31].musicAssetAddress,
    records[40].audioStorageObject.cid,
    'Toby Fox UNDERTALE soundtrack',
    '新 地球',
    'fantasy soundtrack',
  ];

  return [50, 100, 300, 500].map((candidateCount) => {
    const pool = expandRecords(records, candidateCount);
    const samples = [];

    for (let i = 0; i < 18; i++) {
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
}

function summarizeQueryCategories(queries) {
  const counts = new Map();
  for (const query of queries) {
    counts.set(query.category, (counts.get(query.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

function selectRepresentativeCases(records, queries) {
  const selectedCategories = new Set(['typo', 'compact', 'resource_key']);
  const selectedQueries = [];

  for (const query of queries) {
    if (selectedCategories.has(query.category)) {
      selectedQueries.push(query);
      selectedCategories.delete(query.category);
    }
    if (!selectedCategories.size) break;
  }

  return selectedQueries.map((query) => {
    const topResults = rankResourceRecords(records, query.text, NOW)
      .slice(0, 3)
      .map((item) => ({
        id: item.record.id,
        title: item.record.title,
        score: item.score,
        reasons: item.reasons,
      }));

    return {
      id: query.id,
      category: query.category,
      text: query.text,
      relevant: query.relevance,
      top_results: topResults,
    };
  });
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => row[column]).join(',')).join('\n');
  return `${header}\n${body}\n`;
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.join(' | ')} |`;
  const separator = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => row[column]).join(' | ')} |`).join('\n');
  return `${header}\n${separator}\n${body}`;
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function formatFloat(value) {
  return value.toFixed(4);
}

function writeOutputs() {
  mkdirSync(figuresDataDir, { recursive: true });
  mkdirSync(experimentOutDir, { recursive: true });

  const sourceStats = extractSourceStats();
  const { records, groupsByKey, groups } = buildSimulationCorpus();
  const queries = buildQueries(groupsByKey);
  const methods = buildMethods(records);

  validateInputs(records, queries);
  validateFullRankingParity(records, queries);

  const methodSummary = summarizeMethods(methods, queries);
  const latencySummary = summarizeLatency(records);
  const categorySummary = summarizeQueryCategories(queries);
  const representativeCases = selectRepresentativeCases(records, queries);

  writeFileSync(
    resolve(figuresDataDir, 'search_ranking_metrics.csv'),
    toCsv(methodSummary, [
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
    toCsv(latencySummary, ['candidate_count', 'avg_latency_ms', 'p95_latency_ms']),
    'utf8',
  );

  writeFileSync(
    resolve(figuresDataDir, 'search_query_categories.csv'),
    toCsv(categorySummary, ['category', 'count']),
    'utf8',
  );

  writeFileSync(
    resolve(experimentOutDir, 'search_ranking_summary.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        dataset: {
          resource_count: records.length,
          query_count: queries.length,
          reference_time: NOW.toISOString(),
          simulated_group_count: groups.length,
        },
        seed_statistics: sourceStats,
        groups: groups.map((group) => ({
          key: group.key,
          artist: group.artist,
          album: group.album,
          genre_label: group.genreLabel,
          track_count: groupsByKey[group.key].records.length,
        })),
        sample_tracks: records.map((record) => ({
          id: record.id,
          title: record.title,
          artist: record.artistName,
          album: record.albumName,
          genre_label: record.genreLabel,
          token_id: record.tokenId,
        })),
        methods: methodSummary,
        latency: latencySummary,
        query_categories: categorySummary,
        representative_cases: representativeCases,
      },
      null,
      2,
    ),
    'utf8',
  );

  const markdownRows = methodSummary.map((item) => ({
    method: item.method_label,
    'P@10': formatFloat(item.precision_at_10),
    MRR: formatFloat(item.mrr),
    'nDCG@10': formatFloat(item.ndcg_at_10),
    'Zero Result Rate': formatPercent(item.zero_result_rate_pct),
    'Avg Latency (ms)': item.avg_latency_ms.toFixed(4),
  }));

  const latencyRows = latencySummary.map((item) => ({
    Candidates: item.candidate_count,
    'Avg Latency (ms)': item.avg_latency_ms.toFixed(4),
    'P95 Latency (ms)': item.p95_latency_ms.toFixed(4),
  }));

  const groupRows = groups.map((group) => ({
    Group: group.key,
    Artist: shortText(group.artist, 20),
    Album: shortText(group.album, 34),
    Tracks: groupsByKey[group.key].records.length,
  }));

  const summaryMarkdown = [
    '# Search Ranking Experiment',
    '',
    `- Indexed resources: ${records.length}`,
    `- Query set size: ${queries.length}`,
    `- Simulated artist/album clusters: ${groups.length}`,
    `- Reference timestamp: ${NOW.toISOString()}`,
    '',
    '## Retrieval Metrics',
    '',
    toMarkdownTable(markdownRows, [
      'method',
      'P@10',
      'MRR',
      'nDCG@10',
      'Zero Result Rate',
      'Avg Latency (ms)',
    ]),
    '',
    '## Cluster Layout',
    '',
    toMarkdownTable(groupRows, ['Group', 'Artist', 'Album', 'Tracks']),
    '',
    '## Latency by Candidate Count',
    '',
    toMarkdownTable(latencyRows, ['Candidates', 'Avg Latency (ms)', 'P95 Latency (ms)']),
    '',
    '## Representative Cases',
    '',
    representativeCases
      .map((item) => {
        const resultLines = item.top_results
          .map((result, index) => {
            return `${index + 1}. ${result.title} (${result.score.toFixed(3)}) - ${result.reasons.join(' / ')}`;
          })
          .join('\n');
        return `### ${item.id} ${item.text}\n\n${resultLines}`;
      })
      .join('\n\n'),
    '',
  ].join('\n');

  writeFileSync(resolve(experimentOutDir, 'search_ranking_summary.md'), summaryMarkdown, 'utf8');

  console.log(summaryMarkdown);
}

writeOutputs();
