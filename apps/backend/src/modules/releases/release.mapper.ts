import type { PersistedCreatorRelease } from './release.repository.js';

export type ReleaseActivityEntry = {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  at: string;
};

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
    audioSourcePath: record.audioSourcePath,
    coverSourceName: record.coverSourceName,
    coverSourcePath: record.coverSourcePath,
    audioCid: record.audioCid,
    audioGatewayUrl: record.audioGatewayUrl,
    coverCid: record.coverCid,
    coverGatewayUrl: record.coverGatewayUrl,
    metadataCid: record.metadataCid,
    metadataUri: record.metadataUri,
    metadataGatewayUrl: record.metadataGatewayUrl,
    splitterAddress: record.splitterAddress,
    publishTxHash: record.publishTxHash,
    purchaseTxHash: record.purchaseTxHash,
    tokenId: record.tokenId,
    chainId: record.chainId,
    chainName: record.chainName,
    explorerUrl: record.explorerUrl,
    musicAssetAddress: record.musicAssetAddress,
    royaltySplitterFactoryAddress: record.royaltySplitterFactoryAddress,
    platformHubAddress: record.platformHubAddress,
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
