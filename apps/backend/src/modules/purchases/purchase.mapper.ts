import type { PersistedPurchase } from './purchase.repository.js';

export function mapPurchaseRecord(record: PersistedPurchase) {
  return {
    id: record.id,
    releaseId: record.releaseId,
    buyerUserId: record.buyerUserId,
    walletAddress: record.walletAddress,
    chainId: record.chainId,
    txHash: record.txHash,
    amountWei: record.amountWei,
    status: record.status,
    purchasedAt: record.purchasedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
