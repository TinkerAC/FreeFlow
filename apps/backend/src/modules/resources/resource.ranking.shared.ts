import { buildReleaseResourceKey } from './resource.repository.js';

export type ResourceRankingRecord = {
  id: string;
  title: string | null;
  artistName: string | null;
  albumName: string | null;
  genreLabel: string | null;
  description: string | null;
  chainId: number | null;
  musicAssetAddress: string | null;
  platformHubAddress: string | null;
  tokenId: string | null;
  publishTxHash: string | null;
  audioStorageObject: { cid: string | null } | null;
  coverStorageObject: { cid: string | null } | null;
  metadataStorageObject: { cid: string | null } | null;
  _count: {
    comments: number;
    purchases: number;
  };
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
};

export type NormalizedQuery = {
  raw: string;
  normalized: string;
  compact: string;
  tokens: string[];
  address: string | null;
  cid: string | null;
  tokenId: string | null;
  resourceKey: string | null;
};

export type ScoredResourceRecord<TRecord extends ResourceRankingRecord = ResourceRankingRecord> = {
  record: TRecord;
  score: number;
  reasons: string[];
  features: Record<string, number>;
  matched: boolean;
};

export type ResourceRankingConfig = {
  text: boolean;
  fuzzy: boolean;
  identity: boolean;
  freshness: boolean;
  popularity: boolean;
};

type RankState = {
  score: number;
  reasons: string[];
  features: Record<string, number>;
  queryMatched: boolean;
};

type FieldWeights = {
  exact: number;
  prefix: number;
  contains: number;
  token: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_HALF_LIFE_DAYS = 45;

const TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}]+/u;
const TOKEN_COMPACT_PATTERN = /[^\p{L}\p{N}]+/gu;
const CID_PATTERN = /\b(?:bafy[a-z2-7]{20,}|bafk[a-z2-7]{20,}|Qm[1-9A-HJ-NP-Za-km-z]{44})\b/i;
const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/;

const TITLE_FIELD_WEIGHTS: FieldWeights = { exact: 45, prefix: 30, contains: 20, token: 14 };
const ARTIST_FIELD_WEIGHTS: FieldWeights = { exact: 34, prefix: 24, contains: 16, token: 12 };
const ALBUM_FIELD_WEIGHTS: FieldWeights = { exact: 24, prefix: 16, contains: 10, token: 8 };
const GENRE_FIELD_WEIGHTS: FieldWeights = { exact: 20, prefix: 14, contains: 8, token: 6 };
const DESCRIPTION_FIELD_WEIGHTS: FieldWeights = { exact: 10, prefix: 8, contains: 6, token: 4 };

/**
 * 线上排序始终启用完整的链上资源排序策略。
 * 实验代码会复用这一份预设，并按维度关闭能力来构造消融基线，
 * 从而避免在实验脚本里再次复制一套打分实现。
 */
export const DEFAULT_CHAIN_RESOURCE_RANKING_CONFIG: Readonly<ResourceRankingConfig> = {
  text: true,
  fuzzy: true,
  identity: true,
  freshness: true,
  popularity: true,
};

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

/**
 * 查询归一化同时服务于线上检索与离线实验。
 * 将其收敛到同一个位置，可以确保实验中的地址、CID、Token ID
 * 识别逻辑与正式搜索接口完全一致。
 */
export function normalizeChainSearchQuery(raw: string): NormalizedQuery {
  const normalized = normalizeText(raw);
  const compact = compactText(normalized);
  const address = normalized.match(ADDRESS_PATTERN)?.[0]?.toLowerCase() ?? null;
  const cid = normalized.match(CID_PATTERN)?.[0]?.toLowerCase() ?? null;
  const tokenId = /^\d+$/.test(normalized) ? normalized : null;
  const resourceKey = /^chain:\d+:0x[a-f0-9]{40}:.+$/i.test(normalized)
    ? normalized.toLowerCase()
    : null;

  return {
    raw,
    normalized,
    compact,
    tokens: tokenize(normalized),
    address,
    cid,
    tokenId,
    resourceKey,
  };
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}

function addScore(
  state: RankState,
  feature: string,
  score: number,
  reason: string | null,
  queryMatched = false,
) {
  if (!Number.isFinite(score) || score <= 0) return;
  state.score += score;
  state.features[feature] = roundScore((state.features[feature] ?? 0) + score);
  if (reason && !state.reasons.includes(reason)) state.reasons.push(reason);
  if (queryMatched) state.queryMatched = true;
}

function getResourceKey(release: ResourceRankingRecord) {
  return buildReleaseResourceKey({
    chainId: release.chainId,
    musicAssetAddress: release.musicAssetAddress,
    tokenId: release.tokenId,
  }) ?? release.id;
}

function getStorageCids(release: ResourceRankingRecord) {
  return [
    release.audioStorageObject?.cid ?? null,
    release.coverStorageObject?.cid ?? null,
    release.metadataStorageObject?.cid ?? null,
  ].filter((cid): cid is string => Boolean(cid));
}

function levenshtein(left: string, right: string) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1).fill(0);

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

function normalizedSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  if (maxLength === 0) return 0;
  const distance = levenshtein(left, right);
  return Math.max(0, 1 - distance / maxLength);
}

function tokenOverlap(queryTokens: string[], fieldValue: string) {
  if (!queryTokens.length) return 0;
  const fieldTokens = new Set(tokenize(fieldValue));
  if (!fieldTokens.size) return 0;

  let hit = 0;
  for (const token of queryTokens) {
    if (fieldTokens.has(token)) hit++;
  }
  return hit / queryTokens.length;
}

function scoreTextField(
  state: RankState,
  query: NormalizedQuery,
  value: string | null | undefined,
  field: string,
  label: string,
  weights: FieldWeights,
) {
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

function scoreIdentityFields(state: RankState, query: NormalizedQuery, release: ResourceRankingRecord) {
  if (!query.normalized) return;

  const resourceKey = getResourceKey(release).toLowerCase();
  const tokenId = normalizeText(release.tokenId);
  const contractAddress = normalizeText(release.musicAssetAddress);
  const platformHubAddress = normalizeText(release.platformHubAddress);
  const publishTxHash = normalizeText(release.publishTxHash);

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

  const cids = getStorageCids(release).map((cid) => cid.toLowerCase());
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

function scoreTextSimilarity(state: RankState, query: NormalizedQuery, release: ResourceRankingRecord) {
  if (query.compact.length < 3) return;
  const queryText = query.compact.slice(0, 96);

  const fields = [
    release.title,
    [release.title, release.artistName].filter(Boolean).join(' '),
    release.artistName,
    release.albumName,
    release.genreLabel,
    release.description,
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

function freshnessScore(release: ResourceRankingRecord, now: Date) {
  const date = release.publishedAt ?? release.updatedAt ?? release.createdAt;
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
}

function popularityScore(release: ResourceRankingRecord) {
  const comments = release._count?.comments ?? 0;
  const purchases = release._count?.purchases ?? 0;
  const weighted = comments + purchases * 3;
  return Math.min(1, Math.log1p(weighted) / Math.log1p(30));
}

/**
 * 这是线上搜索与离线排序实验共用的打分流水线。
 * 实验可以按需关闭某个维度，以衡量身份字段、时效性或模糊匹配
 * 对整体效果带来的边际收益。
 */
export function rankResourceRecordsWithConfig<TRecord extends ResourceRankingRecord>(
  records: TRecord[],
  keyword: string,
  config: ResourceRankingConfig,
  now: Date = new Date(),
): ScoredResourceRecord<TRecord>[] {
  const query = normalizeChainSearchQuery(keyword);
  const hasQuery = query.normalized.length > 0;

  return records
    .map((record): ScoredResourceRecord<TRecord> => {
      const state: RankState = {
        score: 0,
        reasons: [],
        features: {},
        queryMatched: !hasQuery,
      };

      if (config.identity) {
        scoreIdentityFields(state, query, record);
      }

      if (config.text) {
        scoreTextField(state, query, record.title, 'text.title', '标题', TITLE_FIELD_WEIGHTS);
        scoreTextField(state, query, record.artistName, 'text.artist', '艺术家', ARTIST_FIELD_WEIGHTS);
        scoreTextField(state, query, record.albumName, 'text.album', '专辑', ALBUM_FIELD_WEIGHTS);
        scoreTextField(state, query, record.genreLabel, 'text.genre', '流派', GENRE_FIELD_WEIGHTS);
        scoreTextField(
          state,
          query,
          record.description,
          'text.description',
          '描述',
          DESCRIPTION_FIELD_WEIGHTS,
        );
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
