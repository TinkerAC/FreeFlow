import { z } from 'zod';

export const UpsertPurchaseSchema = z.object({
  releaseId: z.string().trim().min(1),
  walletAddress: z.string().trim().min(1).max(42),
  chainId: z.number().int().positive(),
  txHash: z.string().trim().min(1).max(100),
  amountWei: z.string().trim().regex(/^\d+$/),
  status: z.enum(['pending', 'confirmed', 'failed', 'refunded']).default('confirmed'),
  purchasedAt: z.string().datetime().optional().nullable(),
});

export type UpsertPurchaseInput = z.infer<typeof UpsertPurchaseSchema>;
