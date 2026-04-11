import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';

function isAllowedOrigin(origin: string | undefined) {
  if (!origin) return true;
  if (origin === 'null') return env.allowNullOrigin || env.allowedOrigins.includes('null');
  return env.allowedOrigins.includes(origin);
}

/**
 * 统一处理跨域策略。
 * 当前策略是白名单透传，请求通过后把真实 origin 回写给浏览器。
 */
export const applyCors: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,PATCH');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
};
