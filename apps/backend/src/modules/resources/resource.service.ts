import { AppError } from '../../core/errors/app-error.js';
import { mapResourceRecord } from './resource.mapper.js';
import { resourceRepository, type PersistedResourceRecord } from './resource.repository.js';
import { CHAIN_RESOURCE_RANKING_ALGORITHM, normalizeChainSearchQuery, rankResourceRecords } from './resource.ranking.js';

function mergeResourceRecords(records: PersistedResourceRecord[]) {
  const byId = new Map<string, PersistedResourceRecord>();
  for (const record of records) {
    byId.set(record.id, record);
  }
  return [...byId.values()];
}

/**
 * 资源检索服务。
 */
export class ResourceService {
  async searchTracks(keyword: string, limit: number) {
    const normalizedQuery = normalizeChainSearchQuery(keyword);
    const candidateLimit = Math.min(500, Math.max(80, limit * 8));
    const lexicalCandidates = await resourceRepository.searchPublishedTracks(keyword, candidateLimit);

    // Fuzzy ranking needs a small recent pool too, otherwise typo queries that miss SQL `contains`
    // would have no candidate to score.
    const recentCandidates = normalizedQuery.normalized
      ? await resourceRepository.searchPublishedTracks('', Math.min(200, candidateLimit))
      : [];
    const records = mergeResourceRecords([...lexicalCandidates, ...recentCandidates]);
    const rankedRecords = rankResourceRecords(records, keyword).slice(0, limit);

    return {
      items: rankedRecords.map((ranked) => mapResourceRecord(ranked.record, {
        algorithm: ranked.algorithm,
        score: ranked.score,
        reasons: ranked.reasons,
        features: ranked.features,
      })),
      ranking: {
        algorithm: CHAIN_RESOURCE_RANKING_ALGORITHM,
        query: {
          normalized: normalizedQuery.normalized,
          tokens: normalizedQuery.tokens,
          address: normalizedQuery.address,
          cid: normalizedQuery.cid,
          tokenId: normalizedQuery.tokenId,
          resourceKey: normalizedQuery.resourceKey,
        },
        candidateCount: records.length,
        matchedCount: rankedRecords.length,
      },
    };
  }

  async resolveTrack(resourceKey: string) {
    const record = await resourceRepository.findPublishedTrackByResourceKey(resourceKey);
    if (!record) {
      throw new AppError(404, 'Resource not found', 'RESOURCE_NOT_FOUND', {
        resourceKey,
      });
    }
    return mapResourceRecord(record);
  }
}

export const resourceService = new ResourceService();
