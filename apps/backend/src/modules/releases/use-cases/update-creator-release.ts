import { Prisma } from '@prisma/client';
import { AppError } from '../../../core/errors/app-error.js';
import { mapReleaseRecord, parseActivityLog } from '../release.mapper.js';
import { releaseRepository } from '../release.repository.js';
import {
  asJsonValue,
  shouldRegenerateAutoSlug,
  slugifyReleaseValue,
  toNullableStatusMessage,
  toNullableString,
} from '../release.utils.js';
import type { PersistedCreatorRelease } from '../release.repository.js';
import type { UpdateCreatorReleaseInput } from '../release.schemas.js';

/**
 * 把接口 patch 输入转换成 Prisma 可直接消费的更新数据。
 */
function buildReleaseUpdateData(
  existing: PersistedCreatorRelease,
  input: UpdateCreatorReleaseInput,
) {
  const nextActivityLog = parseActivityLog(existing.activityLog);
  if (input.activityEntry) {
    nextActivityLog.unshift({
      message: input.activityEntry.message,
      level: input.activityEntry.level,
      at: input.activityEntry.at ?? new Date().toISOString(),
    });
  }

  const data: Prisma.CreatorReleaseUpdateInput = {
    lastActivityAt: new Date(),
  };

  if (input.title !== undefined) {
    data.title = input.title.trim();
    data.slug = shouldRegenerateAutoSlug(existing.slug)
      ? `${slugifyReleaseValue(input.title)}-${existing.id.slice(-6)}`
      : existing.slug;
  }
  if (input.artistName !== undefined) data.artistName = toNullableString(input.artistName);
  if (input.albumName !== undefined) data.albumName = toNullableString(input.albumName);
  if (input.genreLabel !== undefined) data.genreLabel = toNullableString(input.genreLabel);
  if (input.slug !== undefined) data.slug = slugifyReleaseValue(input.slug);
  if (input.description !== undefined) data.description = toNullableString(input.description);
  if (input.status !== undefined) data.status = input.status;
  if (input.currentStage !== undefined) data.currentStage = input.currentStage.trim();
  if (input.accessModel !== undefined) data.accessModel = input.accessModel;
  if (input.previewSeconds !== undefined) data.previewSeconds = input.previewSeconds;
  if (input.priceEth !== undefined) data.priceEth = input.priceEth.trim();
  if (input.royaltyBps !== undefined) data.royaltyBps = input.royaltyBps;
  if (input.audioSourceName !== undefined) data.audioSourceName = toNullableString(input.audioSourceName);
  if (input.coverSourceName !== undefined) data.coverSourceName = toNullableString(input.coverSourceName);
  if (input.audioStorageObjectId !== undefined) {
    data.audioStorageObject = input.audioStorageObjectId
      ? { connect: { id: input.audioStorageObjectId } }
      : { disconnect: true };
  }
  if (input.coverStorageObjectId !== undefined) {
    data.coverStorageObject = input.coverStorageObjectId
      ? { connect: { id: input.coverStorageObjectId } }
      : { disconnect: true };
  }
  if (input.metadataStorageObjectId !== undefined) {
    data.metadataStorageObject = input.metadataStorageObjectId
      ? { connect: { id: input.metadataStorageObjectId } }
      : { disconnect: true };
  }
  if (input.metadataDocument !== undefined) data.metadataDocument = asJsonValue(input.metadataDocument);
  if (input.royaltySplits !== undefined) data.royaltySplits = asJsonValue(input.royaltySplits);
  if (input.statusMessage !== undefined) data.statusMessage = toNullableStatusMessage(input.statusMessage);
  if (input.latestError !== undefined) data.latestError = toNullableString(input.latestError);

  if (input.activityEntry) {
    // 活动日志只保留最近 30 条，避免单条记录无限膨胀。
    data.activityLog = nextActivityLog.slice(0, 30) as Prisma.InputJsonValue;
    if (input.statusMessage === undefined) {
      data.statusMessage = toNullableStatusMessage(input.activityEntry.message);
    }
  }

  return data;
}

async function assertStorageObjectBelongsToCreator(
  creatorUserId: string,
  storageObjectId: string | null | undefined,
) {
  if (!storageObjectId) return;

  const storageObject = await releaseRepository.findStorageObjectForUser(creatorUserId, storageObjectId);
  if (!storageObject) {
    throw new AppError(400, 'Storage object not found for creator', 'STORAGE_OBJECT_NOT_FOUND');
  }
}

async function assertStorageLinksBelongToCreator(
  creatorUserId: string,
  input: UpdateCreatorReleaseInput,
) {
  await Promise.all([
    assertStorageObjectBelongsToCreator(creatorUserId, input.audioStorageObjectId),
    assertStorageObjectBelongsToCreator(creatorUserId, input.coverStorageObjectId),
    assertStorageObjectBelongsToCreator(creatorUserId, input.metadataStorageObjectId),
  ]);
}

async function syncPublishedTrackResource(
  creatorUserId: string,
  release: PersistedCreatorRelease,
) {
  if (
    release.status !== 'PUBLISHED' ||
    !release.platformDeployment ||
    !release.tokenId
  ) {
    return false;
  }

  await releaseRepository.upsertPublishedTrackResource({
    releaseId: release.id,
    creatorUserId,
    platformDeploymentId: release.platformDeployment.id,
    chainId: release.platformDeployment.chainId,
    musicAssetAddress: release.platformDeployment.musicAssetAddress,
    tokenId: release.tokenId,
    contentCid: release.metadataStorageObject?.cid ?? null,
    title: release.title,
  });

  return true;
}

/**
 * 更新发行草稿的可变字段，并在发布成功后同步资源索引。
 */
export async function updateCreatorRelease(
  creatorUserId: string,
  releaseId: string,
  input: UpdateCreatorReleaseInput,
) {
  const existing = await releaseRepository.findByIdForCreator(creatorUserId, releaseId);
  if (!existing) {
    throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
  }

  await assertStorageLinksBelongToCreator(creatorUserId, input);

  const data = buildReleaseUpdateData(existing, input);
  const updated = await releaseRepository.updateForCreator(creatorUserId, releaseId, data);
  if (!updated) {
    throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
  }

  const didSyncResource = await syncPublishedTrackResource(creatorUserId, updated);
  const finalRecord = didSyncResource
    ? await releaseRepository.findByIdForCreator(creatorUserId, releaseId)
    : updated;

  return mapReleaseRecord(finalRecord ?? updated);
}
