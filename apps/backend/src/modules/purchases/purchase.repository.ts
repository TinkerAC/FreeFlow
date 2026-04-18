import { prisma } from '../../infra/database/prisma.js';
import type { UpsertPurchaseInput } from './purchase.schemas.js';

export class PurchaseRepository {
  async findReleaseById(releaseId: string) {
    return prisma.creatorRelease.findUnique({
      where: {
        id: releaseId,
      },
      select: {
        id: true,
      },
    });
  }

  async upsertForBuyer(buyerUserId: string, input: UpsertPurchaseInput) {
    const walletAddressLower = input.walletAddress.toLowerCase();
    const txHashLower = input.txHash.toLowerCase();
    const purchasedAt = input.purchasedAt ? new Date(input.purchasedAt) : new Date();

    return prisma.purchase.upsert({
      where: {
        releaseId_walletAddressLower_chainId: {
          releaseId: input.releaseId,
          walletAddressLower,
          chainId: input.chainId,
        },
      },
      update: {
        walletAddress: input.walletAddress,
        txHash: input.txHash,
        txHashLower,
        amountWei: input.amountWei,
        status: input.status,
        purchasedAt,
      },
      create: {
        releaseId: input.releaseId,
        buyerUserId,
        walletAddress: input.walletAddress,
        walletAddressLower,
        chainId: input.chainId,
        txHash: input.txHash,
        txHashLower,
        amountWei: input.amountWei,
        status: input.status,
        purchasedAt,
      },
    });
  }
}

export type PersistedPurchase = Awaited<ReturnType<PurchaseRepository['upsertForBuyer']>>;

export const purchaseRepository = new PurchaseRepository();
