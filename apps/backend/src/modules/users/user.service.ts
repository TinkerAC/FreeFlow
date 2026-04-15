import type { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { createScopedLogger } from '../../infra/logging/logger.js';
import { userRepository } from './user.repository.js';
import type { UpdateUserProfileInput } from './user.schemas.js';

type UserWithPrimaryWallet = Prisma.UserGetPayload<{
  include: {
    primaryWalletIdentity: true;
  };
}>;

type UploadAvatarInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
};

type ImgurUploadResponse = {
  success?: boolean;
  status?: number;
  data?: {
    link?: string;
    deletehash?: string;
  };
};

const userLogger = createScopedLogger('modules.users.service');

function mapUserProfile(user: UserWithPrimaryWallet) {
  return {
    userId: user.id,
    displayName: user.displayName ?? '',
    avatarUrl: user.avatarUrl ?? null,
    walletAddress: user.primaryWalletIdentity?.address ?? null,
    chainId: user.primaryWalletIdentity?.chainId ?? null,
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UserService {
  private async requireUser(userId: string): Promise<UserWithPrimaryWallet> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
    }
    return user;
  }

  async getCurrentUserProfile(userId: string) {
    const user = await this.requireUser(userId);
    return mapUserProfile(user);
  }

  async updateCurrentUserProfile(userId: string, input: UpdateUserProfileInput) {
    const nextDisplayName = Object.prototype.hasOwnProperty.call(input, 'displayName')
      ? (input.displayName?.trim() ? input.displayName.trim() : null)
      : undefined;
    const nextAvatarUrl = Object.prototype.hasOwnProperty.call(input, 'avatarUrl')
      ? (input.avatarUrl?.trim() ? input.avatarUrl.trim() : null)
      : undefined;

    const updated = await userRepository.updateById(userId, {
      ...(nextDisplayName !== undefined ? { displayName: nextDisplayName } : {}),
      ...(nextAvatarUrl !== undefined ? { avatarUrl: nextAvatarUrl } : {}),
    });

    return mapUserProfile(updated);
  }

  async uploadAvatarToImgurAndUpdateProfile(userId: string, input: UploadAvatarInput) {
    if (!input.mimeType.startsWith('image/')) {
      throw new AppError(400, 'Avatar must be an image file', 'INVALID_AVATAR_FILE');
    }
    if (!input.buffer.byteLength) {
      throw new AppError(400, 'Avatar file is empty', 'INVALID_AVATAR_FILE');
    }
    if (!env.imgurClientId) {
      throw new AppError(503, 'Imgur upload is not configured', 'IMGUR_NOT_CONFIGURED');
    }

    const formData = new FormData();
    formData.append('type', 'base64');
    formData.append('image', input.buffer.toString('base64'));
    formData.append('name', input.filename);

    const response = await fetch('https://api.imgur.com/3/image', {
      method: 'POST',
      headers: {
        Authorization: `Client-ID ${env.imgurClientId}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => null) as ImgurUploadResponse | null;
    const avatarUrl = payload?.data?.link;
    if (!response.ok || !payload?.success || !avatarUrl) {
      userLogger.warn({
        statusCode: response.status,
        statusText: response.statusText,
        payload,
      }, 'imgur upload failed');
      throw new AppError(502, 'Failed to upload avatar to Imgur', 'IMGUR_UPLOAD_FAILED', payload);
    }

    const updated = await userRepository.updateById(userId, {
      avatarUrl,
    });
    return mapUserProfile(updated);
  }
}

export const userService = new UserService();
