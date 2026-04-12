import type { AuthSession as DbAuthSession, Prisma, SiweNonce, User, WalletIdentity } from '@prisma/client';
import { sha256Hex } from '../../core/utils/crypto.js';
import { prisma } from '../../infra/database/prisma.js';

type UserWithWalletIdentity = {
  user: User;
  walletIdentity: WalletIdentity;
};

export type PersistedAuthSession = DbAuthSession & {
  user: User;
  walletIdentity: WalletIdentity;
};

function lowerCaseAddress(address: string) {
  return address.toLowerCase();
}

async function touchPrimaryWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  primaryWalletIdentityId: string,
) {
  await tx.user.update({
    where: { id: userId },
    data: {
      primaryWalletIdentityId,
    },
  });
}

/**
 * 认证仓储层负责和数据库交互，不承载 SIWE 校验或 HTTP 协议逻辑。
 */
export class AuthRepository {
  async createNonce(input: {
    nonce: string;
    requestedAddress?: string;
    requestedChainId?: number;
    expiresAt: Date;
  }) {
    const data = {
      nonceHash: sha256Hex(input.nonce),
      expiresAt: input.expiresAt,
      ...(input.requestedAddress
        ? {
          requestedAddress: input.requestedAddress,
          requestedAddressLower: lowerCaseAddress(input.requestedAddress),
        }
        : {}),
      ...(input.requestedChainId !== undefined
        ? {
          requestedChainId: input.requestedChainId,
        }
        : {}),
    };

    return prisma.siweNonce.create({
      data,
    });
  }

  async consumeNonce(nonce: string) {
    const nonceHash = sha256Hex(nonce);
    const nonceRecord = await prisma.siweNonce.findUnique({
      where: { nonceHash },
    });

    if (!nonceRecord || nonceRecord.consumedAt || nonceRecord.expiresAt <= new Date()) {
      return null;
    }

    const consumedAt = new Date();
    const updated = await prisma.siweNonce.updateMany({
      where: {
        id: nonceRecord.id,
        consumedAt: null,
        expiresAt: {
          gt: consumedAt,
        },
      },
      data: {
        consumedAt,
      },
    });

    if (updated.count === 0) {
      return null;
    }

    return {
      ...nonceRecord,
      consumedAt,
    } satisfies SiweNonce;
  }

  async upsertVerifiedWallet(input: {
    address: string;
    chainId: number;
    verifiedAt: Date;
  }): Promise<UserWithWalletIdentity> {
    const addressLower = lowerCaseAddress(input.address);

    return prisma.$transaction(async (tx) => {
      // 同一个链上地址只允许映射到唯一的钱包身份记录。
      const existingWallet = await tx.walletIdentity.findUnique({
        where: {
          addressLower_chainId: {
            addressLower,
            chainId: input.chainId,
          },
        },
        include: {
          user: true,
        },
      });

      if (existingWallet) {
        const walletIdentity = await tx.walletIdentity.update({
          where: { id: existingWallet.id },
          data: {
            address: input.address,
            verifiedAt: input.verifiedAt,
            lastAuthenticatedAt: input.verifiedAt,
          },
        });

        if (existingWallet.user.primaryWalletIdentityId !== existingWallet.id) {
          await touchPrimaryWallet(tx, existingWallet.user.id, existingWallet.id);
        }

        const user = existingWallet.user.primaryWalletIdentityId !== existingWallet.id
          ? await tx.user.findUniqueOrThrow({ where: { id: existingWallet.user.id } })
          : existingWallet.user;

        return {
          user,
          walletIdentity,
        };
      }

      const user = await tx.user.create({
        data: {},
      });

      const walletIdentity = await tx.walletIdentity.create({
        data: {
          userId: user.id,
          address: input.address,
          addressLower,
          chainId: input.chainId,
          verifiedAt: input.verifiedAt,
          lastAuthenticatedAt: input.verifiedAt,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          primaryWalletIdentityId: walletIdentity.id,
        },
      });

      return {
        user: updatedUser,
        walletIdentity,
      };
    });
  }

  async createSession(input: {
    sessionToken: string;
    userId: string;
    walletIdentityId: string;
    address: string;
    chainId: number;
    domain: string;
    uri: string;
    issuedAt: Date;
    verifiedAt: Date;
    expiresAt: Date;
  }) {
    return prisma.authSession.create({
      data: {
        userId: input.userId,
        walletIdentityId: input.walletIdentityId,
        tokenHash: sha256Hex(input.sessionToken),
        address: input.address,
        chainId: input.chainId,
        domain: input.domain,
        uri: input.uri,
        issuedAt: input.issuedAt,
        verifiedAt: input.verifiedAt,
        expiresAt: input.expiresAt,
        lastSeenAt: input.verifiedAt,
      },
      include: {
        user: true,
        walletIdentity: true,
      },
    });
  }

  async findActiveSessionByToken(sessionToken: string): Promise<PersistedAuthSession | null> {
    const session = await prisma.authSession.findUnique({
      where: {
        tokenHash: sha256Hex(sessionToken),
      },
      include: {
        user: true,
        walletIdentity: true,
      },
    });

    if (!session) return null;

    const now = new Date();
    if (session.revokedAt || session.expiresAt <= now) {
      if (!session.revokedAt) {
        await prisma.authSession.update({
          where: { id: session.id },
          data: {
            revokedAt: now,
          },
        }).catch(() => undefined);
      }
      return null;
    }

    return session;
  }

  async revokeSessionByToken(sessionToken: string) {
    await prisma.authSession.updateMany({
      where: {
        tokenHash: sha256Hex(sessionToken),
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async recordSessionSeen(sessionId: string, seenAt: Date) {
    await prisma.authSession.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        lastSeenAt: seenAt,
      },
    });
  }

  async pruneExpiredAuthArtifacts() {
    const now = new Date();
    const noncesCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sessionsCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.siweNonce.deleteMany({
        where: {
          OR: [
            {
              expiresAt: {
                lt: now,
              },
            },
            {
              consumedAt: {
                lt: noncesCutoff,
              },
            },
          ],
        },
      }),
      prisma.authSession.updateMany({
        where: {
          expiresAt: {
            lt: now,
          },
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      }),
      prisma.authSession.deleteMany({
        where: {
          OR: [
            {
              revokedAt: {
                lt: sessionsCutoff,
              },
            },
            {
              expiresAt: {
                lt: sessionsCutoff,
              },
            },
          ],
        },
      }),
    ]);
  }
}

export const authRepository = new AuthRepository();
