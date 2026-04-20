import type { Prisma } from '@prisma/client';
import { CREATOR_RELEASE_PUBLISHED_STATUS } from '@freeflow/web25-shared';
import { AppError } from '../../core/errors/app-error.js';
import { mapReleaseRecord } from '../releases/release.mapper.js';
import { releaseRepository } from '../releases/release.repository.js';
import { mapRoyaltyClaimRecord } from './royalty.mapper.js';
import { royaltyRepository } from './royalty.repository.js';
import type { RecordRoyaltyClaimInput } from './royalty.schemas.js';

function splitContainsAccount(revenueSplits: Prisma.JsonValue | null, accountAddress: string) {
  if (!Array.isArray(revenueSplits)) return false;
  const normalized = accountAddress.toLowerCase();
  return revenueSplits.some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const address = (item as { address?: unknown }).address;
    return typeof address === 'string' && address.toLowerCase() === normalized;
  });
}

export class RoyaltyService {
  async listRoyaltyWorkspace(userId: string, accountAddress: string, chainId?: number | null) {
    const candidates = await releaseRepository.listPublishedRoyaltyCandidates();
    const releases = candidates
      .filter((release) => {
        if (chainId && release.chainId !== chainId) return false;
        return release.creatorUserId === userId || splitContainsAccount(release.revenueSplits, accountAddress);
      })
      .map((release) => mapReleaseRecord(release));

    const claims = await royaltyRepository.listClaimsForAccount(accountAddress, chainId);

    return {
      accountAddress,
      chainId: chainId ?? null,
      releases,
      claims: claims.map((claim) => mapRoyaltyClaimRecord(claim)),
    };
  }

  async recordClaim(userId: string, sessionAddress: string, input: RecordRoyaltyClaimInput) {
    if (sessionAddress.toLowerCase() !== input.accountAddress.toLowerCase()) {
      throw new AppError(403, 'Claim account must match current SIWE wallet', 'CLAIM_ACCOUNT_MISMATCH');
    }

    const release = await royaltyRepository.findReleaseForClaim(input.releaseId);
    if (!release) {
      throw new AppError(404, 'Release not found', 'RELEASE_NOT_FOUND');
    }
    if (release.status !== CREATOR_RELEASE_PUBLISHED_STATUS) {
      throw new AppError(400, 'Release is not published', 'RELEASE_NOT_PUBLISHED');
    }
    if (!release.splitterAddress || release.splitterAddress.toLowerCase() !== input.splitterAddress.toLowerCase()) {
      throw new AppError(400, 'Splitter address does not match release', 'SPLITTER_MISMATCH');
    }
    if (release.chainId !== input.chainId) {
      throw new AppError(400, 'Chain id does not match release', 'CHAIN_ID_MISMATCH');
    }
    if (release.creatorUserId !== userId && !splitContainsAccount(release.revenueSplits, input.accountAddress)) {
      throw new AppError(403, 'Current account is not part of this royalty split', 'ROYALTY_ACCOUNT_FORBIDDEN');
    }

    const claim = await royaltyRepository.upsertClaimForAccount(userId, input);
    return mapRoyaltyClaimRecord(claim);
  }
}

export const royaltyService = new RoyaltyService();
