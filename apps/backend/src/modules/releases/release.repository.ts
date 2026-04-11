import { Prisma, ResourceType } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

const releaseInclude = {
  audioStorageObject: true,
  coverStorageObject: true,
  metadataStorageObject: true,
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
        uploaderUserId: userId,
      },
    });
  }

  async upsertPublishedTrackResource(input: {
    creatorUserId: string;
    chainId: number;
    contractAddress: string;
    tokenId: string;
    contentCid?: string | null;
    title?: string | null;
  }) {
    const contractAddressLower = input.contractAddress.toLowerCase();

    await prisma.resource.upsert({
      where: {
        chainId_contractAddressLower_tokenId: {
          chainId: input.chainId,
          contractAddressLower,
          tokenId: input.tokenId,
        },
      },
      update: {
        type: ResourceType.TRACK,
        contractAddress: input.contractAddress,
        contractAddressLower,
        contentCid: input.contentCid ?? null,
        title: input.title ?? null,
        ownerUserId: input.creatorUserId,
      },
      create: {
        type: ResourceType.TRACK,
        chainId: input.chainId,
        contractAddress: input.contractAddress,
        contractAddressLower,
        tokenId: input.tokenId,
        contentCid: input.contentCid ?? null,
        title: input.title ?? null,
        ownerUserId: input.creatorUserId,
      },
    });
  }
}

export type PersistedCreatorRelease = Awaited<ReturnType<ReleaseRepository['findByIdForCreator']>> extends infer T
  ? Exclude<T, null>
  : never;

export const releaseRepository = new ReleaseRepository();
