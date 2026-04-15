export const DEFAULT_PROFILE_ID = 'default';

export type ProfileType = 'local' | 'wallet';

export interface ProfileSummary {
  id: string;
  name: string;
  type: ProfileType;
  walletAddress?: string;
  chainId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileIndex {
  activeProfileId: string;
  profiles: ProfileSummary[];
}

export interface WalletProfileInput {
  address: string;
  chainId: number;
}

export function normalizeWalletAddress(address: string): string {
  const normalized = address.trim().toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) {
    throw new Error('Invalid wallet address');
  }
  return normalized;
}

export function buildWalletProfileId(input: WalletProfileInput): string {
  return `wallet-${input.chainId}-${normalizeWalletAddress(input.address)}`;
}

export function buildWalletProfileName(input: WalletProfileInput): string {
  const address = normalizeWalletAddress(input.address);
  return `${address.slice(0, 6)}...${address.slice(-4)} / Sepolia`;
}
