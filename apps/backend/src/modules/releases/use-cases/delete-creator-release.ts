import { AppError } from '../../../core/errors/app-error.js';
import { releaseRepository } from '../release.repository.js';

export async function deleteCreatorRelease(creatorUserId: string, releaseId: string) {
  const result = await releaseRepository.deleteForCreator(creatorUserId, releaseId);
  if (!result) {
    throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
  }

  return result;
}
