import { CREATOR_RELEASE_PUBLISHED_STATUS } from '@freeflow/web25-shared';
import { Prisma, ResourceType } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

const storageObjectInclude = {
  uploads: {
    orderBy: {
      createdAt: 'desc',
    },
    take: 1,
  },
} satisfies Prisma.StorageObjectInclude;

const resourceInclude = {
  publishedRelease: {
    include: {
      audioStorageObject: {
        include: storageObjectInclude,
      },
      coverStorageObject: {
        include: storageObjectInclude,
      },
      metadataStorageObject: {
        include: storageObjectInclude,
      },
    },
  },
} satisfies Prisma.ResourceInclude;

/**
 * 资源索引仓储。
 * 这里只负责持久化查询，业务筛选逻辑由 service 组合。
 */
export class ResourceRepository {
  async searchPublishedTracks(keyword: string, limit: number) {
    const normalized = keyword.trim();

    const where: Prisma.ResourceWhereInput = {
      type: ResourceType.TRACK,
      publishedRelease: {
        is: {
          status: CREATOR_RELEASE_PUBLISHED_STATUS,
        },
      },
    };

    if (normalized) {
      const lowered = normalized.toLowerCase();
      where.OR = [
        { title: { contains: normalized, mode: 'insensitive' } },
        { tokenId: { contains: normalized, mode: 'insensitive' } },
        { contentCid: { contains: normalized, mode: 'insensitive' } },
        { contractAddressLower: { contains: lowered } },
        { resourceKey: { contains: lowered, mode: 'insensitive' } },
        { publishedRelease: { is: { title: { contains: normalized, mode: 'insensitive' } } } },
        { publishedRelease: { is: { artistName: { contains: normalized, mode: 'insensitive' } } } },
        { publishedRelease: { is: { albumName: { contains: normalized, mode: 'insensitive' } } } },
      ];
    }

    return prisma.resource.findMany({
      where,
      include: resourceInclude,
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });
  }

  async findPublishedTrackByResourceKey(resourceKey: string) {
    return prisma.resource.findFirst({
      where: {
        resourceKey,
        type: ResourceType.TRACK,
        publishedRelease: {
          is: {
            status: CREATOR_RELEASE_PUBLISHED_STATUS,
          },
        },
      },
      include: resourceInclude,
    });
  }
}

export type PersistedResourceRecord = Awaited<ReturnType<ResourceRepository['findPublishedTrackByResourceKey']>> extends infer T
  ? Exclude<T, null>
  : never;

export const resourceRepository = new ResourceRepository();
