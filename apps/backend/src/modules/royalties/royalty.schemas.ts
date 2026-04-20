import { z } from 'zod';

export const RecordRoyaltyClaimSchema = z.object({
  releaseId: z.string().trim().min(1),
  accountAddress: z.string().trim().min(1).max(42),
  splitterAddress: z.string().trim().min(1).max(42),
  chainId: z.number().int().positive(),
  txHash: z.string().trim().min(1).max(100),
  amountWei: z.string().trim().regex(/^\d+$/),
  claimedAt: z.string().datetime().optional().nullable(),
});

export type RecordRoyaltyClaimInput = z.infer<typeof RecordRoyaltyClaimSchema>;
