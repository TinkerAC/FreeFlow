import { getAddress } from 'ethers';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { createOpaqueToken } from '../../lib/crypto.js';
import { TtlStore } from '../../lib/ttl-store.js';
import { parseSiweMessage, verifySiweSignature } from './siwe.js';
import type { AuthSession } from './auth.types.js';

type NonceRecord = {
  nonce: string;
  address?: string;
  chainId?: number;
  createdAt: string;
};

const nonceStore = new TtlStore<NonceRecord>();
const sessionStore = new TtlStore<AuthSession>();

export class AuthService {
  issueNonce(input: { address: string | undefined; chainId: number | undefined }) {
    const nonce = createOpaqueToken(16).slice(0, 20);
    const normalizedAddress = input.address ? getAddress(input.address) : undefined;
    const nonceRecord: NonceRecord = {
      nonce,
      createdAt: new Date().toISOString(),
    };

    if (normalizedAddress) {
      nonceRecord.address = normalizedAddress;
    }
    if (input.chainId !== undefined) {
      nonceRecord.chainId = input.chainId;
    }

    nonceStore.set(
      nonce,
      nonceRecord,
      env.nonceTtlMs,
    );

    return {
      nonce,
      domain: env.siweDomain,
      uri: env.siweUri,
      statement: env.siweStatement,
      version: '1' as const,
      expiresInSeconds: Math.floor(env.nonceTtlMs / 1000),
    };
  }

  verify(input: { message: string; signature: string }) {
    const parsedMessage = parseSiweMessage(input.message);
    const recoveredAddress = verifySiweSignature(input.message, input.signature);
    const storedNonce = nonceStore.take(parsedMessage.nonce);

    if (!storedNonce) {
      throw new AppError(401, 'Nonce is missing or expired', 'NONCE_EXPIRED');
    }

    if (storedNonce.address && storedNonce.address !== parsedMessage.address) {
      throw new AppError(401, 'Nonce/address mismatch', 'NONCE_ADDRESS_MISMATCH');
    }

    if (storedNonce.chainId && storedNonce.chainId !== parsedMessage.chainId) {
      throw new AppError(401, 'Nonce/chain mismatch', 'NONCE_CHAIN_MISMATCH');
    }

    if (recoveredAddress !== parsedMessage.address) {
      throw new AppError(401, 'Recovered address does not match SIWE message', 'ADDRESS_MISMATCH');
    }

    if (parsedMessage.domain !== env.siweDomain) {
      throw new AppError(401, 'Unexpected SIWE domain', 'INVALID_SIWE_DOMAIN');
    }

    if (parsedMessage.uri !== env.siweUri) {
      throw new AppError(401, 'Unexpected SIWE URI', 'INVALID_SIWE_URI');
    }

    if (!env.allowedChainIds.includes(parsedMessage.chainId)) {
      throw new AppError(401, 'Chain is not allowed for SIWE login', 'CHAIN_NOT_ALLOWED');
    }

    const issuedAt = Date.parse(parsedMessage.issuedAt);
    if (Number.isNaN(issuedAt)) {
      throw new AppError(401, 'Issued At is invalid', 'INVALID_ISSUED_AT');
    }

    const now = Date.now();
    const tenMinutesMs = 10 * 60 * 1000;
    if (Math.abs(now - issuedAt) > tenMinutesMs) {
      throw new AppError(401, 'SIWE message is outside the allowed time window', 'STALE_SIWE_MESSAGE');
    }

    if (parsedMessage.expirationTime) {
      const expirationTime = Date.parse(parsedMessage.expirationTime);
      if (Number.isNaN(expirationTime) || expirationTime <= now) {
        throw new AppError(401, 'SIWE message has expired', 'SIWE_MESSAGE_EXPIRED');
      }
    }

    if (parsedMessage.notBefore) {
      const notBefore = Date.parse(parsedMessage.notBefore);
      if (Number.isNaN(notBefore) || notBefore > now) {
        throw new AppError(401, 'SIWE message is not active yet', 'SIWE_NOT_ACTIVE');
      }
    }

    const sessionId = createOpaqueToken(32);
    const verifiedAt = new Date().toISOString();
    const session: AuthSession = {
      sessionId,
      address: parsedMessage.address,
      chainId: parsedMessage.chainId,
      nonce: parsedMessage.nonce,
      domain: parsedMessage.domain,
      uri: parsedMessage.uri,
      issuedAt: parsedMessage.issuedAt,
      verifiedAt,
    };

    sessionStore.set(sessionId, session, env.sessionTtlMs);

    return {
      sessionToken: sessionId,
      session,
    };
  }

  getSession(sessionToken?: string | null) {
    if (!sessionToken) return null;
    return sessionStore.get(sessionToken);
  }

  revokeSession(sessionToken?: string | null) {
    if (!sessionToken) return;
    sessionStore.delete(sessionToken);
  }
}

export const authService = new AuthService();
