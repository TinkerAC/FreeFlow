import { mapReleaseRecord } from '../release.mapper.js';
import { releaseRepository } from '../release.repository.js';
import { normalizeNullableString, slugifyReleaseValue } from '../release.utils.js';
import type { CreateCreatorReleaseInput } from '../release.schemas.js';

/**
 * 创建新的发行草稿，并补齐系统默认字段。
 */
export async function createCreatorRelease(
  creatorUserId: string,
  input: CreateCreatorReleaseInput,
) {
  const title = input.title?.trim() || 'Untitled Draft';
  const createData: Parameters<typeof releaseRepository.createForCreator>[1] = {
    title,
    slug: `${slugifyReleaseValue(title)}-${Date.now().toString(36)}`,
    accessModel: input.accessModel ?? 'purchase',
    statusMessage: 'Draft created',
  };

  if (input.artistName !== undefined) {
    createData.artistName = normalizeNullableString(input.artistName) ?? null;
  }

  const created = await releaseRepository.createForCreator(creatorUserId, createData);
  return mapReleaseRecord(created);
}
