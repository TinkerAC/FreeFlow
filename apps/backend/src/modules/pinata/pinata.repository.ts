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
    gatewayUrl: string;
    network: string;
    groupId?: string | null;
  }) {
    return prisma.storageObject.upsert({
      where: {
        cid: input.cid,
      },
      update: {
        uploaderUserId: input.uploaderUserId,
        pinataId: input.pinataId ?? null,
        name: input.name,
        size: input.size,
        mimeType: input.mimeType,
        gatewayUrl: input.gatewayUrl,
        network: input.network,
        groupId: input.groupId ?? null,
      },
      create: {
        uploaderUserId: input.uploaderUserId,
        cid: input.cid,
        pinataId: input.pinataId ?? null,
        name: input.name,
        size: input.size,
        mimeType: input.mimeType,
        gatewayUrl: input.gatewayUrl,
        network: input.network,
        groupId: input.groupId ?? null,
      },
    });
  }
}

export const pinataRepository = new PinataRepository();
