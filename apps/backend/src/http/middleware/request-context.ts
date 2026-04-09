import type { RequestHandler } from 'express';
import { createRequestId } from '../../lib/crypto.js';

export const attachRequestContext: RequestHandler = (req, res, next) => {
  const requestId = createRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
