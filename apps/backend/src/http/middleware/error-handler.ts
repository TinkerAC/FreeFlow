import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, toAppError } from '../../lib/app-error.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error);

  console.error(
    `[${req.requestId ?? 'no-request-id'}] ${appError.code}: ${appError.message}`,
    appError.details ?? '',
  );

  res.status(appError.statusCode).json({
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
