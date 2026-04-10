import { Prisma, ResourceType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

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
    });
  }

  async findByIdForCreator(creatorUserId: string, releaseId: string) {
    return prisma.creatorRelease.findFirst({
      where: {
        id: releaseId,
        creatorUserId,
      },
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

export const releaseRepository = new ReleaseRepository();
