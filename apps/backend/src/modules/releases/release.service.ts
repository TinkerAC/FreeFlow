import { Prisma } from '@prisma/client';
import { AppError } from '../../lib/app-error.js';
import { releaseRepository } from './release.repository.js';
import type { CreateCreatorReleaseInput, UpdateCreatorReleaseInput } from './release.schemas.js';

type ReleaseActivityEntry = {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  at: string;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-track';
}

function normalizeNullableString(value: string | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? null : (value.trim() || null);
}

function toNullableString(value: string | null) {
  return value === null ? null : (value.trim() || null);
}

function asJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function parseActivityLog(value: unknown): ReleaseActivityEntry[] {
  return Array.isArray(value)
    ? value.filter((item): item is ReleaseActivityEntry =>
      !!item &&
      typeof item === 'object' &&
      typeof (item as ReleaseActivityEntry).message === 'string' &&
      typeof (item as ReleaseActivityEntry).level === 'string' &&
      typeof (item as ReleaseActivityEntry).at === 'string')
    : [];
}

function mapRelease(record: Awaited<ReturnType<typeof releaseRepository.findByIdForCreator>> extends infer T
  ? Exclude<T, null>
  : never) {
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

export class ReleaseService {
  async listCreatorReleases(creatorUserId: string) {
    const records = await releaseRepository.listByCreatorUserId(creatorUserId);
    const releases = records.map((record) => mapRelease(record));

    const summary = releases.reduce((acc, release) => {
      acc.total += 1;
      if (release.status === 'PUBLISHED') acc.published += 1;
      if (release.status === 'FAILED') acc.failed += 1;
      if (['DRAFT', 'ASSETS_PENDING', 'ASSETS_UPLOADED', 'METADATA_UPLOADED', 'PUBLISHING'].includes(release.status)) {
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

  async createCreatorRelease(creatorUserId: string, input: CreateCreatorReleaseInput) {
    const title = input.title?.trim() || 'Untitled Draft';
    const createData: Parameters<typeof releaseRepository.createForCreator>[1] = {
      title,
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      accessModel: input.accessModel ?? 'purchase',
      activityLog: [
        {
          message: 'Draft created',
          level: 'info',
          at: new Date().toISOString(),
        },
      ] as Prisma.InputJsonValue,
      statusMessage: 'Draft created',
      lastActivityAt: new Date(),
    };
    if (input.artistName !== undefined) {
      createData.artistName = normalizeNullableString(input.artistName) ?? null;
    }

    const created = await releaseRepository.createForCreator(creatorUserId, createData);

    return mapRelease(created);
  }

  async getCreatorRelease(creatorUserId: string, releaseId: string) {
    const record = await releaseRepository.findByIdForCreator(creatorUserId, releaseId);
    if (!record) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

    return mapRelease(record);
  }

  async updateCreatorRelease(creatorUserId: string, releaseId: string, input: UpdateCreatorReleaseInput) {
    const existing = await releaseRepository.findByIdForCreator(creatorUserId, releaseId);
    if (!existing) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

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
      data.slug = existing.slug && existing.slug.startsWith('untitled-track-')
        ? `${slugify(input.title)}-${existing.id.slice(-6)}`
        : existing.slug;
    }
    if (input.artistName !== undefined) data.artistName = toNullableString(input.artistName);
    if (input.albumName !== undefined) data.albumName = toNullableString(input.albumName);
    if (input.genreLabel !== undefined) data.genreLabel = toNullableString(input.genreLabel);
    if (input.slug !== undefined) data.slug = slugify(input.slug);
    if (input.description !== undefined) data.description = toNullableString(input.description);
    if (input.status !== undefined) data.status = input.status;
    if (input.currentStage !== undefined) data.currentStage = input.currentStage.trim();
    if (input.accessModel !== undefined) data.accessModel = input.accessModel;
    if (input.previewSeconds !== undefined) data.previewSeconds = input.previewSeconds;
    if (input.priceEth !== undefined) data.priceEth = input.priceEth.trim();
    if (input.royaltyBps !== undefined) data.royaltyBps = input.royaltyBps;
    if (input.audioSourceName !== undefined) data.audioSourceName = toNullableString(input.audioSourceName);
    if (input.audioSourcePath !== undefined) data.audioSourcePath = toNullableString(input.audioSourcePath);
    if (input.coverSourceName !== undefined) data.coverSourceName = toNullableString(input.coverSourceName);
    if (input.coverSourcePath !== undefined) data.coverSourcePath = toNullableString(input.coverSourcePath);
    if (input.audioCid !== undefined) data.audioCid = toNullableString(input.audioCid);
    if (input.audioGatewayUrl !== undefined) data.audioGatewayUrl = toNullableString(input.audioGatewayUrl);
    if (input.coverCid !== undefined) data.coverCid = toNullableString(input.coverCid);
    if (input.coverGatewayUrl !== undefined) data.coverGatewayUrl = toNullableString(input.coverGatewayUrl);
    if (input.metadataCid !== undefined) data.metadataCid = toNullableString(input.metadataCid);
    if (input.metadataUri !== undefined) data.metadataUri = toNullableString(input.metadataUri);
    if (input.metadataGatewayUrl !== undefined) data.metadataGatewayUrl = toNullableString(input.metadataGatewayUrl);
    if (input.splitterAddress !== undefined) data.splitterAddress = toNullableString(input.splitterAddress);
    if (input.publishTxHash !== undefined) data.publishTxHash = toNullableString(input.publishTxHash);
    if (input.purchaseTxHash !== undefined) data.purchaseTxHash = toNullableString(input.purchaseTxHash);
    if (input.tokenId !== undefined) data.tokenId = toNullableString(input.tokenId);
    if (input.chainId !== undefined) data.chainId = input.chainId;
    if (input.chainName !== undefined) data.chainName = toNullableString(input.chainName);
    if (input.explorerUrl !== undefined) data.explorerUrl = toNullableString(input.explorerUrl);
    if (input.musicAssetAddress !== undefined) data.musicAssetAddress = toNullableString(input.musicAssetAddress);
    if (input.royaltySplitterFactoryAddress !== undefined) {
      data.royaltySplitterFactoryAddress = toNullableString(input.royaltySplitterFactoryAddress);
    }
    if (input.platformHubAddress !== undefined) data.platformHubAddress = toNullableString(input.platformHubAddress);
    if (input.metadataDocument !== undefined) data.metadataDocument = asJsonValue(input.metadataDocument);
    if (input.royaltySplits !== undefined) data.royaltySplits = asJsonValue(input.royaltySplits);
    if (input.statusMessage !== undefined) data.statusMessage = toNullableString(input.statusMessage);
    if (input.latestError !== undefined) data.latestError = toNullableString(input.latestError);
    if (input.activityEntry) {
      data.activityLog = nextActivityLog.slice(0, 30) as Prisma.InputJsonValue;
      if (input.statusMessage === undefined) {
        data.statusMessage = input.activityEntry.message;
      }
    }
    if ((input.status === 'PUBLISHED') && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await releaseRepository.updateForCreator(creatorUserId, releaseId, data);
    if (!updated) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }

    if (
      updated.status === 'PUBLISHED' &&
      updated.chainId &&
      updated.musicAssetAddress &&
      updated.tokenId
    ) {
      await releaseRepository.upsertPublishedTrackResource({
        creatorUserId,
        chainId: updated.chainId,
        contractAddress: updated.musicAssetAddress,
        tokenId: updated.tokenId,
        contentCid: updated.metadataCid,
        title: updated.title,
      });
    }

    return mapRelease(updated);
  }
}

export const releaseService = new ReleaseService();
