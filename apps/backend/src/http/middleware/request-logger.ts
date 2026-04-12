import type { RequestHandler } from 'express';
import { createScopedLogger } from '../../infra/logging/logger.js';

const httpLogger = createScopedLogger('http.request');

function getDurationMs(startedAt: bigint) {
  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
}

/**
 * 记录每个 HTTP 请求的最终结果。
 * 错误详情由 error-handler 输出，这里负责请求生命周期、状态码和耗时。
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestLog = req.logger ?? httpLogger.child({
    requestId: req.requestId ?? 'no-request-id',
    method: req.method,
    path: req.originalUrl,
  });

  let completed = false;

  res.on('finish', () => {
    completed = true;

    const statusCode = res.statusCode;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const contentLength = res.getHeader('content-length');

    requestLog[level]({
      statusCode,
      durationMs: Number(getDurationMs(startedAt).toFixed(2)),
      contentLength: typeof contentLength === 'string' ? Number(contentLength) : contentLength,
    }, 'http request completed');
  });

  res.on('close', () => {
    if (completed) return;

    requestLog.warn({
      statusCode: res.statusCode,
      durationMs: Number(getDurationMs(startedAt).toFixed(2)),
    }, 'http request aborted');
  });

  next();
};
