import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { parseCookieHeader } from '../../core/utils/cookies.js';
import { authService } from '../../modules/auth/auth.service.js';

function getBearerToken(rawHeader?: string) {
  if (!rawHeader) return null;
  const match = /^Bearer\s+(.+)$/.exec(rawHeader);
  return match?.[1] ?? null;
}

/**
 * 尝试从 Authorization 或 Cookie 中恢复当前请求的登录态。
 * 没有会话时不报错，让匿名访问和受保护访问共用同一套路由链。
 */
export const attachSession: RequestHandler = (req, _res, next) => {
  const bearerToken = getBearerToken(req.header('authorization') ?? undefined);
  const cookieToken = parseCookieHeader(req.header('cookie') ?? undefined)[env.sessionCookieName];
  const sessionToken = bearerToken ?? cookieToken ?? null;

  void (async () => {
    if (!sessionToken) return;

    const session = await authService.getSession(sessionToken);
    if (session) {
      req.authToken = sessionToken;
      req.authSession = session;
      if (req.logger) {
        req.logger = req.logger.child({
          userId: session.userId,
        });
      }
    }
  })()
    .then(() => next())
    .catch(next);
};
