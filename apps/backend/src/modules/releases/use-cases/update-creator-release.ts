import { Prisma } from '@prisma/client';
import { CREATOR_RELEASE_PUBLISHED_STATUS } from '@freeflow/web25-shared';
import { AppError } from '../../../core/errors/app-error.js';
import { mapReleaseRecord } from '../release.mapper.js';
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
  const data: Prisma.CreatorReleaseUpdateInput = {};

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
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === CREATOR_RELEASE_PUBLISHED_STATUS && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
  }
  if (input.currentStage !== undefined) data.currentStage = input.currentStage.trim();
  if (input.accessModel !== undefined) data.accessModel = input.accessModel;
  if (input.previewSeconds !== undefined) data.previewSeconds = input.previewSeconds;
  if (input.priceEth !== undefined) data.priceEth = input.priceEth.trim();
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
  if (input.chainId !== undefined) data.chainId = input.chainId ?? null;
  if (input.chainName !== undefined) data.chainName = toNullableString(input.chainName);
  if (input.explorerUrl !== undefined) data.explorerUrl = toNullableString(input.explorerUrl);
  if (input.musicAssetAddress !== undefined) data.musicAssetAddress = toNullableString(input.musicAssetAddress);
  if (input.platformHubAddress !== undefined) data.platformHubAddress = toNullableString(input.platformHubAddress);
  if (input.splitterAddress !== undefined) data.splitterAddress = toNullableString(input.splitterAddress);
  if (input.publishTxHash !== undefined) data.publishTxHash = toNullableString(input.publishTxHash);
  if (input.publishBlockNumber !== undefined) data.publishBlockNumber = input.publishBlockNumber;
  if (input.tokenId !== undefined) data.tokenId = toNullableString(input.tokenId);
  if (input.metadataDocument !== undefined) data.metadataDocument = asJsonValue(input.metadataDocument);
  if (input.revenueSplits !== undefined) data.revenueSplits = asJsonValue(input.revenueSplits);
  if (input.statusMessage !== undefined) data.statusMessage = toNullableStatusMessage(input.statusMessage);
  if (input.latestError !== undefined) data.latestError = toNullableString(input.latestError);

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

/**
 * 更新发行草稿的可变字段。链上发布结果由前端根据交易回执主动回写。
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

  return mapReleaseRecord(updated);
}
