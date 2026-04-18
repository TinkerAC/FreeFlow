import { env } from '../../config/env.js';
import type { PersistedCreatorRelease } from './release.repository.js';

function mapStorageObject(record: PersistedCreatorRelease['audioStorageObject']) {
  if (!record) return null;

  const latestUpload = record.uploads[0] ?? null;

  return {
    id: record.id,
    cid: record.cid,
    pinataId: latestUpload?.pinataId ?? null,
    name: latestUpload?.originalName ?? record.cid,
    size: record.size,
    mimeType: record.mimeType,
    gatewayUrl: `${env.pinataGatewayBaseUrl.replace(/\/$/, '')}/${record.cid}`,
    network: latestUpload?.network ?? null,
    groupId: latestUpload?.groupId ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}

/**
 * 将 Prisma 记录转换成稳定的 API 返回结构。
 * 所有日期都在这里统一转成 ISO 字符串，避免路由层重复做格式处理。
 */
export function mapReleaseRecord(record: PersistedCreatorRelease) {
  return {
    id: record.id,
    creatorUserId: record.creatorUserId,
    title: record.title,
    artistName: record.artistName,
    albumName: record.albumName,
    genreLabel: record.genreLabel,
    slug: record.slug,
    description: record.description,
    status: record.status,
    currentStage: record.currentStage,
    accessModel: record.accessModel,
    previewSeconds: record.previewSeconds,
    priceEth: record.priceEth,
    audioSourceName: record.audioSourceName,
    coverSourceName: record.coverSourceName,
    audioStorageObjectId: record.audioStorageObjectId,
    coverStorageObjectId: record.coverStorageObjectId,
    metadataStorageObjectId: record.metadataStorageObjectId,
    audioStorageObject: mapStorageObject(record.audioStorageObject),
    coverStorageObject: mapStorageObject(record.coverStorageObject),
    metadataStorageObject: mapStorageObject(record.metadataStorageObject),
    splitterAddress: record.splitterAddress,
    publishTxHash: record.publishTxHash,
    publishBlockNumber: record.publishBlockNumber?.toString() ?? null,
    tokenId: record.tokenId,
    chainId: record.chainId ?? null,
    chainName: record.chainName,
    explorerUrl: record.explorerUrl,
    musicAssetAddress: record.musicAssetAddress,
    platformHubAddress: record.platformHubAddress,
    metadataDocument: record.metadataDocument ?? null,
    revenueSplits: Array.isArray(record.revenueSplits) ? record.revenueSplits : [],
    statusMessage: record.statusMessage,
    latestError: record.latestError,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
