import type { PersistedRoyaltyClaim } from './royalty.repository.js';

export function mapRoyaltyClaimRecord(record: PersistedRoyaltyClaim) {
  return {
    id: record.id,
    releaseId: record.releaseId,
    claimerUserId: record.claimerUserId,
    accountAddress: record.accountAddress,
    splitterAddress: record.splitterAddress,
    chainId: record.chainId,
    txHash: record.txHash,
    amountWei: record.amountWei,
    claimedAt: record.claimedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
