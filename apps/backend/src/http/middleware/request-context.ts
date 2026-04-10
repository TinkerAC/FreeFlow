import type { RequestHandler } from 'express';
import { createRequestId } from '../../core/utils/crypto.js';

/**
 * 为每个请求补上请求级上下文。
 * 当前只生成 requestId，后续如果要加 tracing/user context，也可以继续收敛在这里。
 */
export const attachRequestContext: RequestHandler = (req, res, next) => {
  const requestId = createRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
