import type { StorageNetwork } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

/**
 * 存储对象仓储层。
 * 负责把第三方存储结果同步进本地数据库，方便后续审计和追踪。
 */
export class PinataRepository {
  async recordStorageObject(input: {
    uploaderUserId: string;
    cid: string;
    pinataId?: string | null;
    name: string;
    size: number;
    mimeType: string;
    network: StorageNetwork;
    groupId?: string | null;
  }) {
    return prisma.$transaction(async (tx) => {
      const storageObject = await tx.storageObject.upsert({
        where: {
          cid: input.cid,
        },
        update: {
          size: input.size,
          mimeType: input.mimeType,
        },
        create: {
          cid: input.cid,
          size: input.size,
          mimeType: input.mimeType,
        },
      });

      const uploadData = {
        storageObjectId: storageObject.id,
        uploaderUserId: input.uploaderUserId,
        pinataId: input.pinataId ?? null,
        originalName: input.name,
        network: input.network,
        groupId: input.groupId ?? null,
      };

      if (input.pinataId) {
        await tx.storageUpload.upsert({
          where: {
            pinataId: input.pinataId,
          },
          update: uploadData,
          create: uploadData,
        });
      } else {
        await tx.storageUpload.create({
          data: uploadData,
        });
      }

      return tx.storageObject.findUniqueOrThrow({
        where: {
          id: storageObject.id,
        },
        include: {
          uploads: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
      });
    });
  }
}

export const pinataRepository = new PinataRepository();
