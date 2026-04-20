import { prisma } from '../../infra/database/prisma.js';
import type { RecordRoyaltyClaimInput } from './royalty.schemas.js';

export class RoyaltyRepository {
  async findReleaseForClaim(releaseId: string) {
    return prisma.creatorRelease.findUnique({
      where: {
        id: releaseId,
      },
      select: {
        id: true,
        status: true,
        splitterAddress: true,
        chainId: true,
        revenueSplits: true,
        creatorUserId: true,
      },
    });
  }

  async listClaimsForAccount(accountAddress: string, chainId?: number | null) {
    const accountAddressLower = accountAddress.toLowerCase();
    return prisma.royaltyClaim.findMany({
      where: {
        accountAddressLower,
        ...(chainId ? { chainId } : {}),
      },
      orderBy: [
        { claimedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async upsertClaimForAccount(claimerUserId: string, input: RecordRoyaltyClaimInput) {
    const accountAddressLower = input.accountAddress.toLowerCase();
    const splitterAddressLower = input.splitterAddress.toLowerCase();
    const txHashLower = input.txHash.toLowerCase();
    const claimedAt = input.claimedAt ? new Date(input.claimedAt) : new Date();

    return prisma.royaltyClaim.upsert({
      where: {
        chainId_txHashLower: {
          chainId: input.chainId,
          txHashLower,
        },
      },
      update: {
        releaseId: input.releaseId,
        claimerUserId,
        accountAddress: input.accountAddress,
        accountAddressLower,
        splitterAddress: input.splitterAddress,
        splitterAddressLower,
        amountWei: input.amountWei,
        claimedAt,
      },
      create: {
        releaseId: input.releaseId,
        claimerUserId,
        accountAddress: input.accountAddress,
        accountAddressLower,
        splitterAddress: input.splitterAddress,
        splitterAddressLower,
        chainId: input.chainId,
        txHash: input.txHash,
        txHashLower,
        amountWei: input.amountWei,
        claimedAt,
      },
    });
  }
}

export type PersistedRoyaltyClaim = Awaited<ReturnType<RoyaltyRepository['upsertClaimForAccount']>>;

export const royaltyRepository = new RoyaltyRepository();
