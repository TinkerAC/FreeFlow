import { z } from 'zod';
import {
  CREATOR_RELEASE_CLIENT_UPDATE_STATUSES,
  RELEASE_ACCESS_MODELS,
  RELEASE_ACTIVITY_LEVELS,
} from '@freeflow/web25-shared';

const optionalNullableChainName = z.string().trim().max(64).optional().nullable();
const optionalNullableExplorerUrl = z.string().trim().max(255).optional().nullable();
const optionalNullableAddress = z.string().trim().max(42).optional().nullable();
const optionalNullableHash = z.string().trim().max(100).optional().nullable();
const optionalNullableTokenId = z.string().trim().max(128).optional().nullable();

const optionalNullableBlockNumber = z.preprocess((value) => {
  if (value === undefined || value === null) return value;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  return value;
}, z.bigint().nonnegative().optional().nullable());

/**
 * 发行模块输入模型。
 * 这里主要负责把前端传入的数据边界固定下来，避免 service 层处理半脏数据。
 */
const ClientEditableCreatorReleaseStatusSchema = z.enum(CREATOR_RELEASE_CLIENT_UPDATE_STATUSES);
const ReleaseAccessModelSchema = z.enum(RELEASE_ACCESS_MODELS);

export const ReleaseActivityEntrySchema = z.object({
  message: z.string().min(1).max(20_000),
  level: z.enum(RELEASE_ACTIVITY_LEVELS).default('info'),
  at: z.string().datetime().optional(),
});

export const ReleaseSplitRecipientSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(64),
  address: z.string().trim().max(42),
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
  status: ClientEditableCreatorReleaseStatusSchema.optional(),
  currentStage: z.string().trim().min(1).max(32).optional(),
  accessModel: ReleaseAccessModelSchema.optional(),
  previewSeconds: z.number().int().min(0).max(3600).optional(),
  priceEth: z.string().trim().max(64).optional(),
  royaltyBps: z.number().int().min(0).max(10_000).optional(),
  audioSourceName: z.string().trim().max(255).optional().nullable(),
  coverSourceName: z.string().trim().max(255).optional().nullable(),
  audioStorageObjectId: z.string().trim().min(1).optional().nullable(),
  coverStorageObjectId: z.string().trim().min(1).optional().nullable(),
  metadataStorageObjectId: z.string().trim().min(1).optional().nullable(),
  chainId: z.number().int().positive().optional().nullable(),
  chainName: optionalNullableChainName,
  explorerUrl: optionalNullableExplorerUrl,
  musicAssetAddress: optionalNullableAddress,
  royaltySplitterFactoryAddress: optionalNullableAddress,
  platformHubAddress: optionalNullableAddress,
  splitterAddress: optionalNullableAddress,
  publishTxHash: optionalNullableHash,
  publishBlockNumber: optionalNullableBlockNumber,
  tokenId: optionalNullableTokenId,
  metadataDocument: z.unknown().optional().nullable(),
  royaltySplits: z.array(ReleaseSplitRecipientSchema).optional().nullable(),
  activityEntry: ReleaseActivityEntrySchema.optional(),
  statusMessage: z.string().trim().max(255).optional().nullable(),
  latestError: z.string().trim().max(20_000).optional().nullable(),
});

export type CreateCreatorReleaseInput = z.infer<typeof CreateCreatorReleaseSchema>;
export type UpdateCreatorReleaseInput = z.infer<typeof UpdateCreatorReleaseSchema>;
