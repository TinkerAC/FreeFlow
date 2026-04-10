export type AuthSession = {
  userId: string;
  walletIdentityId: string;
  address: string;
  chainId: number;
  domain: string;
  uri: string;
  sessionId: string;
  issuedAt: string;
  verifiedAt: string;
  expiresAt: string;
};
