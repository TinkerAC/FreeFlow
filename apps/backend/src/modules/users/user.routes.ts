import { Router } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { parseMultipart } from '../../http/parsers/multipart.js';
import { attachSession } from '../../security/session/attach-session.js';
import { requireAuth } from '../../security/session/require-auth.js';
import { UpdateUserProfileSchema } from './user.schemas.js';
import { userService } from './user.service.js';

export const userRouter = Router();

userRouter.use(attachSession);
userRouter.use(requireAuth);

userRouter.get('/me', async (req, res, next) => {
  try {
    const profile = await userService.getCurrentUserProfile(req.authSession!.userId);
    res.json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/me', async (req, res, next) => {
  try {
    const parsed = UpdateUserProfileSchema.parse(req.body ?? {});
    const profile = await userService.updateCurrentUserProfile(req.authSession!.userId, parsed);
    res.json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});

userRouter.post('/me/avatar', async (req, res, next) => {
  try {
    const parsedMultipart = await parseMultipart(req, {
      maxFileSizeBytes: Math.min(env.uploadMaxFileSizeBytes, 10 * 1024 * 1024),
      maxFields: 5,
    });
    if (!parsedMultipart.file) {
      throw new AppError(400, 'No avatar file uploaded', 'FILE_REQUIRED');
    }

    const profile = await userService.uploadAvatarToImgurAndUpdateProfile(req.authSession!.userId, {
      buffer: parsedMultipart.file.buffer,
      filename: parsedMultipart.file.filename,
      mimeType: parsedMultipart.file.mimeType,
    });

    res.status(201).json({
      ok: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
});
