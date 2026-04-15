import { z } from 'zod';

const DisplayNameSchema = z.string().trim().min(1).max(64);
const AvatarUrlSchema = z.string().trim().url();

export const UpdateUserProfileSchema = z.object({
  displayName: z.union([DisplayNameSchema, z.literal('')]).optional(),
  avatarUrl: z.union([AvatarUrlSchema, z.literal(''), z.null()]).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof UpdateUserProfileSchema>;
