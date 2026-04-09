import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { parseCookieHeader } from '../../lib/cookies.js';
import { authService } from './auth.service.js';

function getBearerToken(rawHeader?: string) {
  if (!rawHeader) return null;
  const match = /^Bearer\s+(.+)$/.exec(rawHeader);
  return match?.[1] ?? null;
}

export const attachSession: RequestHandler = (req, _res, next) => {
  const bearerToken = getBearerToken(req.header('authorization') ?? undefined);
  const cookieToken = parseCookieHeader(req.header('cookie') ?? undefined)[env.sessionCookieName];
  const sessionToken = bearerToken ?? cookieToken ?? null;

  if (sessionToken) {
    const session = authService.getSession(sessionToken);
    if (session) {
      req.authToken = sessionToken;
      req.authSession = session;
    }
  }

  next();
};
