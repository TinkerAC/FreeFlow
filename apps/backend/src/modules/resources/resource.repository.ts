import { CREATOR_RELEASE_PUBLISHED_STATUS } from '@freeflow/web25-shared';
import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

const storageObjectInclude = {
  uploads: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.StorageObjectInclude;

const releaseInclude = {
  audioStorageObject: {
    include: storageObjectInclude,
  },
  coverStorageObject: {
    include: storageObjectInclude,
  },
  metadataStorageObject: {
    include: storageObjectInclude,
  },
  _count: {
    select: {
      comments: true,
      purchases: true,
    },
  },
} satisfies Prisma.CreatorReleaseInclude;

export function buildReleaseResourceKey(input: {
  chainId: number | null;
  musicAssetAddress: string | null;
  tokenId: string | null;
}) {
  if (!input.chainId || !input.musicAssetAddress || !input.tokenId) return null;
  return [
    'chain',
    input.chainId,
    input.musicAssetAddress.toLowerCase(),
    input.tokenId,
  ].join(':');
}

function parseReleaseResourceKey(resourceKey: string) {
  const [kind, chainIdRaw, contractAddressLower, tokenId] = resourceKey.split(':');
  const chainId = Number(chainIdRaw);
  if (kind !== 'chain' || !Number.isInteger(chainId) || !contractAddressLower || !tokenId) {
    return null;
  }
  return {
    chainId,
    contractAddressLower,
    tokenId,
  };
}

export class ResourceRepository {
  async searchPublishedTracks(keyword: string, limit: number) {
    const normalized = keyword.trim();

    const where: Prisma.CreatorReleaseWhereInput = {
      status: CREATOR_RELEASE_PUBLISHED_STATUS,
      chainId: { not: null },
      musicAssetAddress: { not: null },
      tokenId: { not: null },
    };

    if (normalized) {
      const lowered = normalized.toLowerCase();
      const resourceKeyParts = parseReleaseResourceKey(lowered);
      where.OR = [
        { title: { contains: normalized, mode: 'insensitive' } },
        { artistName: { contains: normalized, mode: 'insensitive' } },
        { albumName: { contains: normalized, mode: 'insensitive' } },
        { description: { contains: normalized, mode: 'insensitive' } },
        { genreLabel: { contains: normalized, mode: 'insensitive' } },
        { tokenId: { contains: normalized, mode: 'insensitive' } },
        { musicAssetAddress: { contains: lowered, mode: 'insensitive' } },
        { platformHubAddress: { contains: lowered, mode: 'insensitive' } },
        { publishTxHash: { contains: lowered, mode: 'insensitive' } },
        { audioStorageObject: { is: { cid: { contains: normalized, mode: 'insensitive' } } } },
        { coverStorageObject: { is: { cid: { contains: normalized, mode: 'insensitive' } } } },
        { metadataStorageObject: { is: { cid: { contains: normalized, mode: 'insensitive' } } } },
      ];
      if (resourceKeyParts) {
        where.OR.push({
          chainId: resourceKeyParts.chainId,
          musicAssetAddress: {
            equals: resourceKeyParts.contractAddressLower,
            mode: 'insensitive',
          },
          tokenId: resourceKeyParts.tokenId,
        });
      }
    }

    return prisma.creatorRelease.findMany({
      where,
      include: releaseInclude,
      orderBy: [
        { publishedAt: 'desc' },
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  async findPublishedTrackByResourceKey(resourceKey: string) {
    const parsed = parseReleaseResourceKey(resourceKey);
    if (!parsed) return null;

    return prisma.creatorRelease.findFirst({
      where: {
        status: CREATOR_RELEASE_PUBLISHED_STATUS,
        chainId: parsed.chainId,
        musicAssetAddress: {
          equals: parsed.contractAddressLower,
          mode: 'insensitive',
        },
        tokenId: parsed.tokenId,
      },
      include: releaseInclude,
    });
  }
}

export type PersistedResourceRecord = Awaited<ReturnType<ResourceRepository['findPublishedTrackByResourceKey']>> extends infer T
  ? Exclude<T, null>
  : never;

export const resourceRepository = new ResourceRepository();
