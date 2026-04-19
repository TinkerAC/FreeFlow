import { buildReleaseResourceKey, type PersistedResourceRecord } from './resource.repository.js';

export const CHAIN_RESOURCE_RANKING_ALGORITHM = 'chain_resource_rank_v1';

type NormalizedQuery = {
  raw: string;
  normalized: string;
  compact: string;
  tokens: string[];
  address: string | null;
  cid: string | null;
  tokenId: string | null;
  resourceKey: string | null;
};

export type ResourceRankPayload = {
  algorithm: typeof CHAIN_RESOURCE_RANKING_ALGORITHM;
  score: number;
  reasons: string[];
  features: Record<string, number>;
};

export type RankedResourceRecord = ResourceRankPayload & {
  record: PersistedResourceRecord;
  matched: boolean;
};

type RankState = {
  score: number;
  reasons: string[];
  features: Record<string, number>;
  queryMatched: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESHNESS_HALF_LIFE_DAYS = 45;

const TOKEN_SPLIT_PATTERN = /[^\p{L}\p{N}]+/u;
const TOKEN_COMPACT_PATTERN = /[^\p{L}\p{N}]+/gu;
const CID_PATTERN = /\b(?:bafy[a-z2-7]{20,}|bafk[a-z2-7]{20,}|Qm[1-9A-HJ-NP-Za-km-z]{44})\b/i;
const ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/;

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

function getResourceKey(release: PersistedResourceRecord) {
  return buildReleaseResourceKey({
    chainId: release.chainId,
    musicAssetAddress: release.musicAssetAddress,
    tokenId: release.tokenId,
  }) ?? release.id;
}

function getStorageCids(release: PersistedResourceRecord) {
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
  weights: {
    exact: number;
    prefix: number;
    contains: number;
    token: number;
  },
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

function scoreIdentityFields(state: RankState, query: NormalizedQuery, release: PersistedResourceRecord) {
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

function scoreTextSimilarity(state: RankState, query: NormalizedQuery, release: PersistedResourceRecord) {
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

function freshnessScore(release: PersistedResourceRecord, now: Date) {
  const date = release.publishedAt ?? release.updatedAt ?? release.createdAt;
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / DAY_MS);
  return Math.pow(0.5, ageDays / FRESHNESS_HALF_LIFE_DAYS);
}

function popularityScore(release: PersistedResourceRecord) {
  const comments = release._count?.comments ?? 0;
  const purchases = release._count?.purchases ?? 0;
  const weighted = comments + purchases * 3;
  return Math.min(1, Math.log1p(weighted) / Math.log1p(30));
}

export function rankResourceRecords(
  records: PersistedResourceRecord[],
  keyword: string,
  now: Date = new Date(),
): RankedResourceRecord[] {
  const query = normalizeChainSearchQuery(keyword);
  const hasQuery = query.normalized.length > 0;

  return records
    .map((record): RankedResourceRecord => {
      const state: RankState = {
        score: 0,
        reasons: [],
        features: {},
        queryMatched: !hasQuery,
      };

      scoreIdentityFields(state, query, record);
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
      scoreTextSimilarity(state, query, record);

      const fresh = freshnessScore(record, now);
      addScore(
        state,
        'quality.freshness',
        8 * fresh,
        fresh > 0.85 || !hasQuery ? '最近发布优先' : null,
      );

      const popularity = popularityScore(record);
      addScore(
        state,
        'quality.popularity',
        7 * popularity,
        popularity > 0.15 ? '购买/评论热度较高' : null,
      );

      return {
        record,
        algorithm: CHAIN_RESOURCE_RANKING_ALGORITHM,
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
