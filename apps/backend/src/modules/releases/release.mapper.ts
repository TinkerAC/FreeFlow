import { env } from '../../config/env.js';
import type { PersistedCreatorRelease } from './release.repository.js';

export type ReleaseActivityEntry = {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  at: string;
};

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

function mapPlatformDeployment(record: PersistedCreatorRelease['platformDeployment']) {
  if (!record) return null;

  return {
    id: record.id,
    chainId: record.chainId,
    chainName: record.chainName,
    deploymentKey: record.deploymentKey,
    musicAssetAddress: record.musicAssetAddress,
    royaltySplitterFactoryAddress: record.royaltySplitterFactoryAddress,
    platformHubAddress: record.platformHubAddress,
  };
}

/**
 * 兜底解析数据库中的活动日志 JSON，避免脏数据直接污染接口响应。
 */
export function parseActivityLog(value: unknown): ReleaseActivityEntry[] {
  return Array.isArray(value)
    ? value.filter((item): item is ReleaseActivityEntry =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as ReleaseActivityEntry).message === 'string' &&
      typeof (item as ReleaseActivityEntry).level === 'string' &&
      typeof (item as ReleaseActivityEntry).at === 'string')
    : [];
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
    royaltyBps: record.royaltyBps,
    audioSourceName: record.audioSourceName,
    coverSourceName: record.coverSourceName,
    audioStorageObjectId: record.audioStorageObjectId,
    coverStorageObjectId: record.coverStorageObjectId,
    metadataStorageObjectId: record.metadataStorageObjectId,
    audioStorageObject: mapStorageObject(record.audioStorageObject),
    coverStorageObject: mapStorageObject(record.coverStorageObject),
    metadataStorageObject: mapStorageObject(record.metadataStorageObject),
    platformDeploymentId: record.platformDeploymentId,
    platformDeployment: mapPlatformDeployment(record.platformDeployment),
    splitterAddress: record.splitterAddress,
    publishTxHash: record.publishTxHash,
    publishBlockNumber: record.publishBlockNumber?.toString() ?? null,
    tokenId: record.tokenId,
    chainId: record.platformDeployment?.chainId ?? null,
    chainName: record.platformDeployment?.chainName ?? null,
    musicAssetAddress: record.platformDeployment?.musicAssetAddress ?? null,
    royaltySplitterFactoryAddress: record.platformDeployment?.royaltySplitterFactoryAddress ?? null,
    platformHubAddress: record.platformDeployment?.platformHubAddress ?? null,
    publishedResourceId: record.publishedResourceId,
    metadataDocument: record.metadataDocument ?? null,
    royaltySplits: Array.isArray(record.royaltySplits) ? record.royaltySplits : [],
    activityLog: parseActivityLog(record.activityLog),
    statusMessage: record.statusMessage,
    latestError: record.latestError,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    lastActivityAt: record.lastActivityAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
