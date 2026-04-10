import { AppError } from '../../../core/errors/app-error.js';
import { mapReleaseRecord } from '../release.mapper.js';
import { releaseRepository } from '../release.repository.js';

/**
 * 获取单个发行详情，并保证只能访问自己的数据。
 */
export async function getCreatorRelease(creatorUserId: string, releaseId: string) {
  const record = await releaseRepository.findByIdForCreator(creatorUserId, releaseId);
  if (!record) {
    throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
  }

  return mapReleaseRecord(record);
}
