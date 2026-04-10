import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, toAppError } from '../../core/errors/app-error.js';

/**
 * 将未匹配路由显式转换成统一错误，避免返回结构漂移。
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
};

/**
 * 全局错误处理中间件。
 * 日志里优先打印 requestId，方便把客户端报错和服务端日志串起来。
 */
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
