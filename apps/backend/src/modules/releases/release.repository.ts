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
  publishedResource: true,
} satisfies Prisma.CreatorReleaseInclude;

/**
 * Release 仓储层。
 * 所有和发行实体相关的数据库读写都收敛在这里，避免 service 直接拼 Prisma 语句。
 */
export class ReleaseRepository {
  async listByCreatorUserId(creatorUserId: string) {
    return prisma.creatorRelease.findMany({
      where: {
        creatorUserId,
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      include: releaseInclude,
    });
  }

  async findByIdForCreator(creatorUserId: string, releaseId: string) {
    return prisma.creatorRelease.findFirst({
      where: {
        id: releaseId,
        creatorUserId,
      },
      include: releaseInclude,
    });
  }

  async createForCreator(
    creatorUserId: string,
    data: Omit<Prisma.CreatorReleaseCreateInput, 'creator'>,
  ) {
    return prisma.creatorRelease.create({
      data: {
        ...data,
        creator: {
          connect: {
            id: creatorUserId,
          },
        },
      },
      include: releaseInclude,
    });
  }

  async updateForCreator(creatorUserId: string, releaseId: string, data: Prisma.CreatorReleaseUpdateInput) {
    const existing = await this.findByIdForCreator(creatorUserId, releaseId);
    if (!existing) {
      return null;
    }

    return prisma.creatorRelease.update({
      where: {
        id: existing.id,
      },
      data,
      include: releaseInclude,
    });
  }

  async findStorageObjectForUser(userId: string, storageObjectId: string) {
    return prisma.storageObject.findFirst({
      where: {
        id: storageObjectId,
        uploads: {
          some: {
            uploaderUserId: userId,
          },
        },
      },
    });
  }

  async upsertPublishedTrackResource(input: {
    releaseId: string;
    creatorUserId: string;
    chainId: number;
    musicAssetAddress: string;
    tokenId: string;
    contentCid?: string | null;
    title?: string | null;
  }) {
    const contractAddressLower = input.musicAssetAddress.toLowerCase();
    const resourceKey = [
      'chain',
      input.chainId,
      contractAddressLower,
      input.tokenId,
    ].join(':');

    const resource = await prisma.resource.upsert({
      where: {
        resourceKey,
      },
      update: {
        type: ResourceType.TRACK,
        chainId: input.chainId,
        contractAddress: input.musicAssetAddress,
        contractAddressLower,
        tokenId: input.tokenId,
        contentCid: input.contentCid ?? null,
        title: input.title ?? null,
        ownerUserId: input.creatorUserId,
      },
      create: {
        resourceKey,
        type: ResourceType.TRACK,
        chainId: input.chainId,
        contractAddress: input.musicAssetAddress,
        contractAddressLower,
        tokenId: input.tokenId,
        contentCid: input.contentCid ?? null,
        title: input.title ?? null,
        ownerUserId: input.creatorUserId,
      },
    });

    await prisma.creatorRelease.update({
      where: {
        id: input.releaseId,
      },
      data: {
        publishedResourceId: resource.id,
      },
    });

    return resource;
  }
}

export type PersistedCreatorRelease = Awaited<ReturnType<ReleaseRepository['findByIdForCreator']>> extends infer T
  ? Exclude<T, null>
  : never;

export const releaseRepository = new ReleaseRepository();
