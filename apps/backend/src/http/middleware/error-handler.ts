import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, toAppError } from '../../core/errors/app-error.js';
import { createScopedLogger } from '../../infra/logging/logger.js';

const fallbackLogger = createScopedLogger('http.error');

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
  const level = appError.statusCode >= 500 ? 'error' : 'warn';
  const requestLog = req.logger ?? fallbackLogger.child({
    requestId: req.requestId ?? 'no-request-id',
    method: req.method,
    path: req.originalUrl,
  });

  requestLog[level]({
    err: error instanceof Error ? error : appError,
    errorCode: appError.code,
    statusCode: appError.statusCode,
    details: appError.details,
  }, 'http request failed');

  res.status(appError.statusCode).json({
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
  });
};
