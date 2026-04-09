import type { RequestHandler } from 'express';
import { AppError } from '../../lib/app-error.js';

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.authSession) {
    next(new AppError(401, 'Authentication required', 'AUTH_REQUIRED'));
    return;
  }
  next();
};
