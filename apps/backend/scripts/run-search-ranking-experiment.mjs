#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
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
const NOW = new Date('2026-04-20T12:00:00.000Z');
const PLATFORM_HUB_ADDRESS = '0x00000000000000000000000000000000ff11aa22';

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
  return value.toLowerCase().replace(/[^a-z]/g, '');
}

function makeCid(kind, slug, index) {
  const serial = index.toString(36).replace(/[0189]/g, 'a');
  const body = `${kind}${sanitizeSlug(slug)}${serial}freeflowdataset`
    .replace(/[^a-z2-7]/g, 'a')
    .padEnd(34, 'a')
    .slice(0, 34);
  return `bafy${body}`;
}

function createRecord(index, definition) {
  const publishedAt = new Date(NOW.getTime() - definition.daysAgo * DAY_MS);
  const updatedAt = new Date(publishedAt.getTime() + 6 * 60 * 60 * 1000);
  const createdAt = new Date(publishedAt.getTime() - DAY_MS);

  return {
    id: `track-${String(index).padStart(2, '0')}`,
    title: definition.title,
    artistName: definition.artistName,
    albumName: definition.albumName,
    genreLabel: definition.genreLabel,
    description: definition.description,
    chainId: 11155111,
    musicAssetAddress: makeAddress(10_000 + index),
    platformHubAddress: PLATFORM_HUB_ADDRESS,
    tokenId: String(200 + index),
    publishTxHash: makeHash(90_000 + index),
    audioStorageObject: { cid: makeCid('audio', definition.slug, index) },
    coverStorageObject: { cid: makeCid('cover', definition.slug, index) },
    metadataStorageObject: { cid: makeCid('meta', definition.slug, index) },
    _count: {
      comments: definition.comments,
      purchases: definition.purchases,
    },
    createdAt,
    updatedAt,
    publishedAt,
  };
}

const records = [
  createRecord(1, {
    slug: 'neon-harbor',
    title: 'Neon Harbor',
    artistName: 'Luna Byte',
    albumName: 'Electric Tides',
    genreLabel: 'synthwave',
    description: 'A neon shoreline anthem for on-chain night drives and bright modular synth hooks.',
    daysAgo: 11,
    comments: 5,
    purchases: 10,
  }),
  createRecord(2, {
    slug: 'midnight-circuit',
    title: 'Midnight Circuit',
    artistName: 'Luna Byte',
    albumName: 'Electric Tides',
    genreLabel: 'synthwave',
    description: 'Fast BPM sequencers, dashboard lights, and a crisp retro-futurist chorus.',
    daysAgo: 4,
    comments: 2,
    purchases: 3,
  }),
  createRecord(3, {
    slug: 'signal-bloom',
    title: 'Signal Bloom',
    artistName: 'Luna Byte',
    albumName: 'Electric Tides',
    genreLabel: 'synthwave',
    description: 'A warmer lead line with heavier replay value and a longer melodic tail section.',
    daysAgo: 18,
    comments: 8,
    purchases: 16,
  }),
  createRecord(4, {
    slug: 'paper-lantern-sky',
    title: 'Paper Lantern Sky',
    artistName: 'Echo Harbor',
    albumName: 'Eastbound Lights',
    genreLabel: 'indie folk',
    description: 'Acoustic textures, lantern imagery, and a steady chorus built for replay.',
    daysAgo: 36,
    comments: 3,
    purchases: 4,
  }),
  createRecord(5, {
    slug: 'haifeng-xinhao',
    title: '海风信号',
    artistName: 'Echo Harbor',
    albumName: 'Eastbound Lights',
    genreLabel: 'indie folk',
    description: 'A bilingual single with fingerpicked guitar, tape hiss, and coastal imagery.',
    daysAgo: 15,
    comments: 6,
    purchases: 12,
  }),
  createRecord(6, {
    slug: 'shanyu-lvren',
    title: '山雨旅人',
    artistName: 'Echo Harbor',
    albumName: 'Eastbound Lights',
    genreLabel: 'indie folk',
    description: 'Slower tempo writing focused on rainfall ambience and narrative verses.',
    daysAgo: 52,
    comments: 2,
    purchases: 1,
  }),
  createRecord(7, {
    slug: 'ledger-lullaby',
    title: 'Ledger Lullaby',
    artistName: 'Chain Choir',
    albumName: 'Block Beats Vol.1',
    genreLabel: 'electronic',
    description: 'Melodic arpeggios and soft pads describing wallets, keys, and final balances.',
    daysAgo: 21,
    comments: 4,
    purchases: 9,
  }),
  createRecord(8, {
    slug: 'token-sunrise',
    title: 'Token Sunrise',
    artistName: 'Chain Choir',
    albumName: 'Block Beats Vol.1',
    genreLabel: 'electronic',
    description: 'Brighter percussion and lighter vocal chops for a more accessible first listen.',
    daysAgo: 7,
    comments: 3,
    purchases: 5,
  }),
  createRecord(9, {
    slug: 'cid-carousel',
    title: 'CID Carousel',
    artistName: 'Chain Choir',
    albumName: 'Block Beats Vol.1',
    genreLabel: 'electronic',
    description: 'A denser mix centered on IPFS loops, hash motifs, and club-oriented bass.',
    daysAgo: 29,
    comments: 5,
    purchases: 11,
  }),
  createRecord(10, {
    slug: 'velvet-proxy',
    title: 'Velvet Proxy',
    artistName: 'Blue Cache',
    albumName: 'Proxy Dreams',
    genreLabel: 'dream pop',
    description: 'Dreamy chorused guitars framed around a proxy cache metaphor and slow drums.',
    daysAgo: 27,
    comments: 2,
    purchases: 3,
  }),
  createRecord(11, {
    slug: 'buffering-hearts',
    title: 'Buffering Hearts',
    artistName: 'Blue Cache',
    albumName: 'Proxy Dreams',
    genreLabel: 'dream pop',
    description: 'A mid-tempo single about waiting, retry loops, and soft-focus vocal layers.',
    daysAgo: 13,
    comments: 4,
    purchases: 5,
  }),
  createRecord(12, {
    slug: 'cached-kisses',
    title: 'Cached Kisses',
    artistName: 'Blue Cache',
    albumName: 'Proxy Dreams',
    genreLabel: 'dream pop',
    description: 'The strongest replay track in the album with glossy pads and a memorable refrain.',
    daysAgo: 6,
    comments: 7,
    purchases: 14,
  }),
  createRecord(13, {
    slug: 'sepolia-moon',
    title: 'Sepolia Moon',
    artistName: 'Testnet Kids',
    albumName: 'Gasless Summer',
    genreLabel: 'electro pop',
    description: 'A playful single themed around faucets, test wallets, and summer release notes.',
    daysAgo: 24,
    comments: 2,
    purchases: 5,
  }),
  createRecord(14, {
    slug: 'faucet-romance',
    title: 'Faucet Romance',
    artistName: 'Testnet Kids',
    albumName: 'Gasless Summer',
    genreLabel: 'electro pop',
    description: 'Lightweight hooks and bright pads designed for quick preview and casual listening.',
    daysAgo: 9,
    comments: 1,
    purchases: 2,
  }),
  createRecord(15, {
    slug: 'finality-waltz',
    title: 'Finality Waltz',
    artistName: 'Testnet Kids',
    albumName: 'Gasless Summer',
    genreLabel: 'electro pop',
    description: 'The album centerpiece, pairing strong retention with a heavier chorus payoff.',
    daysAgo: 14,
    comments: 6,
    purchases: 10,
  }),
  createRecord(16, {
    slug: 'yinhe-zhantai',
    title: '银河站台',
    artistName: 'Orbit Diary',
    albumName: '星港回声',
    genreLabel: 'ambient',
    description: 'A wide ambient mix with station ambience, distant bells, and slow filtered motion.',
    daysAgo: 17,
    comments: 5,
    purchases: 8,
  }),
  createRecord(17, {
    slug: 'xingyun-mandi',
    title: '星云慢递',
    artistName: 'Orbit Diary',
    albumName: '星港回声',
    genreLabel: 'ambient',
    description: 'A shorter and newer ambient piece with softer highs and a gentler ending.',
    daysAgo: 5,
    comments: 4,
    purchases: 4,
  }),
  createRecord(18, {
    slug: 'darkmode-dancer',
    title: 'Darkmode Dancer',
    artistName: 'Pixel Pulse',
    albumName: 'UI Afterglow',
    genreLabel: 'future bass',
    description: 'Animated drops, UI motion metaphors, and a clear side-chain pulse.',
    daysAgo: 12,
    comments: 3,
    purchases: 6,
  }),
  createRecord(19, {
    slug: 'gradient-heat',
    title: 'Gradient Heat',
    artistName: 'Pixel Pulse',
    albumName: 'UI Afterglow',
    genreLabel: 'future bass',
    description: 'A softer drop with more background texture and a less prominent hook.',
    daysAgo: 20,
    comments: 1,
    purchases: 2,
  }),
  createRecord(20, {
    slug: 'modal-mirage',
    title: 'Modal Mirage',
    artistName: 'Pixel Pulse',
    albumName: 'UI Afterglow',
    genreLabel: 'future bass',
    description: 'A newer single focused on modal transitions, stereo width, and sharper percussion.',
    daysAgo: 8,
    comments: 2,
    purchases: 4,
  }),
  createRecord(21, {
    slug: 'royalty-rain',
    title: 'Royalty Rain',
    artistName: 'Split Avenue',
    albumName: 'Share of Sound',
    genreLabel: 'alternative',
    description: 'Alternative pop built around royalty splits, settlement logs, and a rainy bridge.',
    daysAgo: 31,
    comments: 2,
    purchases: 7,
  }),
  createRecord(22, {
    slug: 'mint-condition-melody',
    title: 'Mint Condition Melody',
    artistName: 'Split Avenue',
    albumName: 'Share of Sound',
    genreLabel: 'alternative',
    description: 'A lighter song with easy hooks and a cleaner arrangement for first-time listeners.',
    daysAgo: 6,
    comments: 3,
    purchases: 2,
  }),
  createRecord(23, {
    slug: 'access-granted',
    title: 'Access Granted',
    artistName: 'Split Avenue',
    albumName: 'Share of Sound',
    genreLabel: 'alternative',
    description: 'The most complete buyer access track, combining purchase intent and ownership cues.',
    daysAgo: 14,
    comments: 8,
    purchases: 15,
  }),
  createRecord(24, {
    slug: 'proof-of-chorus',
    title: 'Proof of Chorus',
    artistName: 'Consensus Club',
    albumName: 'Validator Songs',
    genreLabel: 'house',
    description: 'Straightforward house structure with chant-like hooks and a steady kick drum.',
    daysAgo: 26,
    comments: 3,
    purchases: 5,
  }),
  createRecord(25, {
    slug: 'node-of-you',
    title: 'Node of You',
    artistName: 'Consensus Club',
    albumName: 'Validator Songs',
    genreLabel: 'house',
    description: 'The strongest emotional hook in the set, with warmer chords and a fuller drop.',
    daysAgo: 11,
    comments: 4,
    purchases: 7,
  }),
  createRecord(26, {
    slug: 'hash-of-dawn',
    title: 'Hash of Dawn',
    artistName: 'Consensus Club',
    albumName: 'Validator Songs',
    genreLabel: 'house',
    description: 'The newest track, emphasizing sunrise energy, looped vocals, and lighter percussion.',
    daysAgo: 3,
    comments: 2,
    purchases: 4,
  }),
];

function byId(index) {
  return records[index - 1];
}

function graded(entries) {
  return Object.fromEntries(entries.map(([index, grade]) => [byId(index).id, grade]));
}

const queries = [
  { id: 'q01', category: 'title_exact', text: byId(1).title, relevance: graded([[1, 3]]) },
  { id: 'q02', category: 'title_exact', text: byId(7).title, relevance: graded([[7, 3]]) },
  { id: 'q03', category: 'title_exact', text: byId(16).title, relevance: graded([[16, 3]]) },
  { id: 'q04', category: 'title_exact', text: byId(21).title, relevance: graded([[21, 3]]) },
  { id: 'q05', category: 'title_exact', text: byId(25).title, relevance: graded([[25, 3]]) },
  { id: 'q06', category: 'artist', text: 'Luna Byte', relevance: graded([[3, 3], [1, 2], [2, 1]]) },
  { id: 'q07', category: 'artist', text: 'Echo Harbor', relevance: graded([[5, 3], [4, 2], [6, 1]]) },
  { id: 'q08', category: 'artist', text: 'Chain Choir', relevance: graded([[9, 3], [7, 2], [8, 1]]) },
  { id: 'q09', category: 'artist', text: 'Testnet Kids', relevance: graded([[15, 3], [13, 2], [14, 1]]) },
  { id: 'q10', category: 'album', text: 'Electric Tides', relevance: graded([[3, 3], [1, 2], [2, 1]]) },
  { id: 'q11', category: 'album', text: 'Proxy Dreams', relevance: graded([[12, 3], [11, 2], [10, 1]]) },
  { id: 'q12', category: 'album', text: 'Gasless Summer', relevance: graded([[15, 3], [13, 2], [14, 1]]) },
  { id: 'q13', category: 'album', text: 'Validator Songs', relevance: graded([[25, 3], [26, 2], [24, 1]]) },
  { id: 'q14', category: 'genre', text: 'synthwave', relevance: graded([[3, 3], [1, 2], [2, 1]]) },
  { id: 'q15', category: 'genre', text: 'indie folk', relevance: graded([[5, 3], [4, 2], [6, 1]]) },
  { id: 'q16', category: 'genre', text: 'alternative', relevance: graded([[23, 3], [21, 2], [22, 1]]) },
  { id: 'q17', category: 'genre', text: 'house', relevance: graded([[25, 3], [26, 2], [24, 1]]) },
  { id: 'q18', category: 'token_id', text: byId(7).tokenId, relevance: graded([[7, 3]]) },
  { id: 'q19', category: 'token_id', text: byId(14).tokenId, relevance: graded([[14, 3]]) },
  { id: 'q20', category: 'token_id', text: byId(23).tokenId, relevance: graded([[23, 3]]) },
  { id: 'q21', category: 'address', text: byId(20).musicAssetAddress, relevance: graded([[20, 3]]) },
  { id: 'q22', category: 'address', text: byId(25).musicAssetAddress, relevance: graded([[25, 3]]) },
  { id: 'q23', category: 'cid', text: byId(9).audioStorageObject.cid, relevance: graded([[9, 3]]) },
  { id: 'q24', category: 'cid', text: byId(17).metadataStorageObject.cid, relevance: graded([[17, 3]]) },
  { id: 'q25', category: 'resource_key', text: buildResourceKey(byId(4)), relevance: graded([[4, 3]]) },
  { id: 'q26', category: 'resource_key', text: buildResourceKey(byId(23)), relevance: graded([[23, 3]]) },
  {
    id: 'q27',
    category: 'tx_hash',
    text: byId(11).publishTxHash.slice(0, 18),
    relevance: graded([[11, 3]]),
  },
  { id: 'q28', category: 'typo', text: 'sepolia mooon', relevance: graded([[13, 3]]) },
  { id: 'q29', category: 'typo', text: 'legder lullaby', relevance: graded([[7, 3]]) },
  { id: 'q30', category: 'typo', text: 'modal miragee', relevance: graded([[20, 3]]) },
  { id: 'q31', category: 'typo', text: 'cache kisses', relevance: graded([[12, 3]]) },
  { id: 'q32', category: 'compact', text: 'neonharbor', relevance: graded([[1, 3]]) },
  { id: 'q33', category: 'fullwidth', text: 'Ｎｅｏｎ　Ｈａｒｂｏｒ', relevance: graded([[1, 3]]) },
  { id: 'q34', category: 'compact', text: '海风 信号', relevance: graded([[5, 3]]) },
  { id: 'q35', category: 'compact', text: 'finalitywaltz', relevance: graded([[15, 3]]) },
  {
    id: 'q36',
    category: 'multi_term',
    text: 'chain choir block beats',
    relevance: graded([[9, 3], [7, 2], [8, 1]]),
  },
  { id: 'q37', category: 'title_exact', text: 'Access Granted', relevance: graded([[23, 3]]) },
  { id: 'q38', category: 'description', text: 'buyer access track', relevance: graded([[23, 3]]) },
  { id: 'q39', category: 'title_exact', text: 'CID Carousel', relevance: graded([[9, 3]]) },
  { id: 'q40', category: 'compact', text: '银河 站台', relevance: graded([[16, 3]]) },
  { id: 'q41', category: 'title_exact', text: 'Mint Condition Melody', relevance: graded([[22, 3]]) },
  { id: 'q42', category: 'title_exact', text: 'Gradient Heat', relevance: graded([[19, 3]]) },
  { id: 'q43', category: 'album', text: 'UI Afterglow', relevance: graded([[18, 3], [20, 2], [19, 1]]) },
  { id: 'q44', category: 'genre', text: 'ambient', relevance: graded([[16, 3], [17, 2]]) },
];

function validateInputs() {
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

function validateFullRankingParity() {
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

const methods = [
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

function summarizeMethods() {
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

function expandRecords(targetCount) {
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
        tokenId: String(1_000 + serial),
        musicAssetAddress: makeAddress(50_000 + serial),
        publishTxHash: makeHash(150_000 + serial),
        audioStorageObject: { cid: makeCid('audio', `${record.id}${serial}`, serial) },
        coverStorageObject: { cid: makeCid('cover', `${record.id}${serial}`, serial) },
        metadataStorageObject: { cid: makeCid('meta', `${record.id}${serial}`, serial) },
        _count: {
          comments: (record._count.comments + serial) % 9,
          purchases: (record._count.purchases + serial) % 17,
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

function summarizeLatency() {
  const queryTexts = [
    'Neon Harbor',
    'legder lullaby',
    buildResourceKey(byId(23)),
    byId(20).musicAssetAddress,
    byId(9).audioStorageObject.cid,
    'chain choir block beats',
    '海风 信号',
    'Validator Songs',
  ];

  return [50, 100, 300, 500].map((candidateCount) => {
    const pool = expandRecords(candidateCount);
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

function summarizeQueryCategories() {
  const counts = new Map();
  for (const query of queries) {
    counts.set(query.category, (counts.get(query.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => left.category.localeCompare(right.category));
}

function selectRepresentativeCases() {
  const selectedIds = new Set(['q25', 'q29', 'q34', 'q36']);
  return queries
    .filter((query) => selectedIds.has(query.id))
    .map((query) => {
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

  validateInputs();
  validateFullRankingParity();

  const methodSummary = summarizeMethods();
  const latencySummary = summarizeLatency();
  const categorySummary = summarizeQueryCategories();
  const representativeCases = selectRepresentativeCases();

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
          now: NOW.toISOString(),
        },
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

  const summaryMarkdown = [
    '# Search Ranking Experiment',
    '',
    `- Indexed resources: ${records.length}`,
    `- Query set size: ${queries.length}`,
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
