import type { RequestHandler } from 'express';
import { createRequestId } from '../../core/utils/crypto.js';
import { createScopedLogger } from '../../infra/logging/logger.js';

const requestContextLogger = createScopedLogger('http.request');

/**
 * 为每个请求补上请求级上下文。
 * 当前生成 requestId 和请求级 logger，后续 tracing/user context 继续收敛在这里。
 */
export const attachRequestContext: RequestHandler = (req, res, next) => {
  const requestId = createRequestId();
  req.requestId = requestId;
  req.logger = requestContextLogger.child({
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });
  res.setHeader('X-Request-Id', requestId);
  next();
};
