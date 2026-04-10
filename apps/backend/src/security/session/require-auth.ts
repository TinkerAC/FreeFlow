import type { RequestHandler } from 'express';
import { AppError } from '../../core/errors/app-error.js';

/**
 * 声明式保护需要登录态的接口。
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.authSession) {
    next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
    return;
  }

  next();
};
