import { mapReleaseRecord } from '../release.mapper.js';
import { releaseRepository } from '../release.repository.js';

const IN_PROGRESS_STATUSES = new Set([
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
]);

/**
 * 列出创作者的发行列表，并顺带返回前端常用的统计摘要。
 */
export async function listCreatorReleases(creatorUserId: string) {
  const records = await releaseRepository.listByCreatorUserId(creatorUserId);
  const releases = records.map((record) => mapReleaseRecord(record));

  const summary = releases.reduce((acc, release) => {
    acc.total += 1;
    if (release.status === 'PUBLISHED') acc.published += 1;
    if (release.status === 'FAILED') acc.failed += 1;
    if (IN_PROGRESS_STATUSES.has(release.status)) {
      acc.inProgress += 1;
    }
    return acc;
  }, {
    total: 0,
    published: 0,
    failed: 0,
    inProgress: 0,
  });

  return {
    summary,
    releases,
  };
}
