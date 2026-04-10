import { getAddress } from 'ethers';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { createOpaqueToken } from '../../core/utils/crypto.js';
import type { AuthSession } from '../../security/auth-session.js';
import { authRepository, type PersistedAuthSession } from './auth.repository.js';
import { parseSiweMessage, verifySiweSignature } from './siwe.js';

type NonceRecord = {
  requestedAddress?: string | null;
  requestedChainId?: number | null;
};

/**
 * 将数据库会话记录投影为请求上下文可直接使用的安全会话对象。
 */
function mapSession(session: PersistedAuthSession): AuthSession {
  return {
    sessionId: session.id,
    userId: session.userId,
    walletIdentityId: session.walletIdentityId,
    address: session.address,
    chainId: session.chainId,
    domain: session.domain,
    uri: session.uri,
    issuedAt: session.issuedAt.toISOString(),
    verifiedAt: session.verifiedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  };
}

/**
 * 认证服务负责 SIWE 验证流程和会话编排。
 * 定时清理等生命周期任务已移动到独立的 maintenance 模块。
 */
export class AuthService {
  async issueNonce(input: { address: string | undefined; chainId: number | undefined }) {
    const nonce = createOpaqueToken(16).slice(0, 20);
    const normalizedAddress = input.address ? getAddress(input.address) : undefined;

    await authRepository.createNonce({
      nonce,
      ...(normalizedAddress ? { requestedAddress: normalizedAddress } : {}),
      ...(input.chainId !== undefined ? { requestedChainId: input.chainId } : {}),
      expiresAt: new Date(Date.now() + env.nonceTtlMs),
    });

    return {
      nonce,
      domain: env.siweDomain,
      uri: env.siweUri,
      statement: env.siweStatement,
      version: '1' as const,
      expiresInSeconds: Math.floor(env.nonceTtlMs / 1000),
    };
  }

  async verify(input: { message: string; signature: string }) {
    const parsedMessage = parseSiweMessage(input.message);
    const recoveredAddress = verifySiweSignature(input.message, input.signature);
    const storedNonce = await authRepository.consumeNonce(parsedMessage.nonce);

    if (!storedNonce) {
      throw new AppError(401, 'Nonce is missing or expired', 'NONCE_EXPIRED');
    }

    const nonceRecord: NonceRecord = {
      requestedAddress: storedNonce.requestedAddress,
      requestedChainId: storedNonce.requestedChainId,
    };

    // 先校验 nonce 绑定条件，再校验签名内容，确保流程语义足够明确。
    if (nonceRecord.requestedAddress && nonceRecord.requestedAddress !== parsedMessage.address) {
      throw new AppError(401, 'Nonce/address mismatch', 'NONCE_ADDRESS_MISMATCH');
    }

    if (
      nonceRecord.requestedChainId !== undefined &&
      nonceRecord.requestedChainId !== null &&
      nonceRecord.requestedChainId !== parsedMessage.chainId
    ) {
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

    // 验签通过后，再把链上身份上升为系统内用户和会话。
    const verifiedAt = new Date();
    const sessionToken = createOpaqueToken(32);
    const identity = await authRepository.upsertVerifiedWallet({
      address: parsedMessage.address,
      chainId: parsedMessage.chainId,
      verifiedAt,
    });

    const session = await authRepository.createSession({
      sessionToken,
      userId: identity.user.id,
      walletIdentityId: identity.walletIdentity.id,
      address: parsedMessage.address,
      chainId: parsedMessage.chainId,
      domain: parsedMessage.domain,
      uri: parsedMessage.uri,
      issuedAt: new Date(issuedAt),
      verifiedAt,
      expiresAt: new Date(verifiedAt.getTime() + env.sessionTtlMs),
    });

    return {
      sessionToken,
      session: mapSession(session),
    };
  }

  async getSession(sessionToken?: string | null) {
    if (!sessionToken) return null;

    const session = await authRepository.findActiveSessionByToken(sessionToken);
    if (!session) return null;

    void authRepository.recordSessionSeen(session.id, new Date()).catch(() => undefined);
    return mapSession(session);
  }

  async revokeSession(sessionToken?: string | null) {
    if (!sessionToken) return;
    await authRepository.revokeSessionByToken(sessionToken);
  }
}

export const authService = new AuthService();
