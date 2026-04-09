import { z } from 'zod';

export const IssueNonceSchema = z.object({
  address: z.string().optional(),
  chainId: z.number().int().positive().optional(),
});

export const VerifySiweSchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});
