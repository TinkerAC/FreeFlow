import { z } from 'zod';

/**
 * 发行模块输入模型。
 * 这里主要负责把前端传入的数据边界固定下来，避免 service 层处理半脏数据。
 */
const CreatorReleaseStatusSchema = z.enum([
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
]);

const ReleaseAccessModelSchema = z.enum(['open', 'purchase']);

export const ReleaseActivityEntrySchema = z.object({
  message: z.string().min(1).max(255),
  level: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  at: z.string().datetime().optional(),
});

export const ReleaseSplitRecipientSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(64),
  address: z.string().max(128),
  share: z.number().min(0).max(100),
});

export const CreateCreatorReleaseSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  artistName: z.string().trim().max(255).optional(),
  accessModel: ReleaseAccessModelSchema.optional(),
});

export const UpdateCreatorReleaseSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  artistName: z.string().trim().max(255).optional().nullable(),
  albumName: z.string().trim().max(255).optional().nullable(),
  genreLabel: z.string().trim().max(255).optional().nullable(),
  slug: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(20_000).optional().nullable(),
  status: CreatorReleaseStatusSchema.optional(),
  currentStage: z.string().trim().min(1).max(32).optional(),
  accessModel: ReleaseAccessModelSchema.optional(),
  previewSeconds: z.number().int().min(0).max(3600).optional(),
  priceEth: z.string().trim().max(64).optional(),
  royaltyBps: z.number().int().min(0).max(10_000).optional(),
  audioSourceName: z.string().trim().max(255).optional().nullable(),
  audioSourcePath: z.string().trim().max(2048).optional().nullable(),
  coverSourceName: z.string().trim().max(255).optional().nullable(),
  coverSourcePath: z.string().trim().max(2048).optional().nullable(),
  audioStorageObjectId: z.string().trim().min(1).optional().nullable(),
  coverStorageObjectId: z.string().trim().min(1).optional().nullable(),
  metadataStorageObjectId: z.string().trim().min(1).optional().nullable(),
  splitterAddress: z.string().trim().max(42).optional().nullable(),
  publishTxHash: z.string().trim().max(100).optional().nullable(),
  purchaseTxHash: z.string().trim().max(100).optional().nullable(),
  tokenId: z.string().trim().max(128).optional().nullable(),
  chainId: z.number().int().optional().nullable(),
  chainName: z.string().trim().max(64).optional().nullable(),
  explorerUrl: z.string().trim().url().max(4096).optional().nullable(),
  musicAssetAddress: z.string().trim().max(42).optional().nullable(),
  royaltySplitterFactoryAddress: z.string().trim().max(42).optional().nullable(),
  platformHubAddress: z.string().trim().max(42).optional().nullable(),
  metadataDocument: z.unknown().optional().nullable(),
  royaltySplits: z.array(ReleaseSplitRecipientSchema).optional().nullable(),
  activityEntry: ReleaseActivityEntrySchema.optional(),
  statusMessage: z.string().trim().max(255).optional().nullable(),
  latestError: z.string().trim().max(20_000).optional().nullable(),
});

export type CreateCreatorReleaseInput = z.infer<typeof CreateCreatorReleaseSchema>;
export type UpdateCreatorReleaseInput = z.infer<typeof UpdateCreatorReleaseSchema>;
