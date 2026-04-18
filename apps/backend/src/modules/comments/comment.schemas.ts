import { z } from 'zod';

export const ListCommentsQuerySchema = z.object({
  releaseId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().trim().min(1).optional(),
});

export const CreateCommentSchema = z.object({
  releaseId: z.string().trim().min(1),
  body: z.string().trim().min(1).max(5000),
});

export type ListCommentsQuery = z.infer<typeof ListCommentsQuerySchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
