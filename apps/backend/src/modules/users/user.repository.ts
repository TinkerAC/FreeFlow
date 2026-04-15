import type { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma.js';

type UserWithPrimaryWallet = Prisma.UserGetPayload<{
  include: {
    primaryWalletIdentity: true;
  };
}>;

export class UserRepository {
  async findById(userId: string): Promise<UserWithPrimaryWallet | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        primaryWalletIdentity: true,
      },
    });
  }

  async updateById(
    userId: string,
    input: {
      displayName?: string | null;
      avatarUrl?: string | null;
    },
  ): Promise<UserWithPrimaryWallet> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(Object.prototype.hasOwnProperty.call(input, 'displayName')
          ? { displayName: input.displayName }
          : {}),
        ...(Object.prototype.hasOwnProperty.call(input, 'avatarUrl')
          ? { avatarUrl: input.avatarUrl }
          : {}),
      },
      include: {
        primaryWalletIdentity: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
