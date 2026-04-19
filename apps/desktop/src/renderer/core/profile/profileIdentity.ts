import type { Web25Session } from '@renderer/core/web25/client';
import type { ProfileSummary } from '@src/shared/profile/profile';

export function normalizeAddress(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

export function sameAddress(left?: string | null, right?: string | null): boolean {
  const normalizedLeft = normalizeAddress(left);
  const normalizedRight = normalizeAddress(right);
  return !!normalizedLeft && !!normalizedRight && normalizedLeft === normalizedRight;
}

export function formatShortAddress(value?: string | null): string {
  if (!value) return '未连接';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function getProfileWalletAddress(profile?: ProfileSummary | null): string {
  return normalizeAddress(profile?.walletAddress);
}

export function getSessionAddress(session?: Web25Session | null): string {
  return normalizeAddress(session?.address);
}

export function getWalletAddress(address?: string | null): string {
  return normalizeAddress(address);
}

export function sessionMatchesProfile(profile?: ProfileSummary | null, session?: Web25Session | null): boolean {
  const profileAddress = getProfileWalletAddress(profile);
  if (!profileAddress || !session) return true;
  return sameAddress(profileAddress, session.address);
}

export function walletMatchesProfile(profile?: ProfileSummary | null, address?: string | null): boolean {
  const profileAddress = getProfileWalletAddress(profile);
  if (!profileAddress || !address) return true;
  return sameAddress(profileAddress, address);
}
