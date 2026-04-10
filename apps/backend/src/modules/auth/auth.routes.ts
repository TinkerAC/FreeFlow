import { Router } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../core/errors/app-error.js';
import { attachSession } from '../../security/session/attach-session.js';
import { IssueNonceSchema, VerifySiweSchema } from './auth.schemas.js';
import { authService } from './auth.service.js';

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.cookieSecure,
  path: '/' as const,
};

/**
 * 认证模块的 HTTP 入口。
 * 路由层只负责参数解析、Cookie 协议和响应格式，不负责认证规则本身。
 */
export const authRouter = Router();

authRouter.use(attachSession);

authRouter.post('/siwe/nonce', async (req, res, next) => {
  try {
    const parsed = IssueNonceSchema.parse(req.body ?? {});
    const payload = await authService.issueNonce({
      address: parsed.address,
      chainId: parsed.chainId,
    });
    res.status(201).json({
      ok: true,
      data: payload,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/siwe/verify', async (req, res, next) => {
  try {
    const parsed = VerifySiweSchema.parse(req.body ?? {});
    const result = await authService.verify(parsed);

    res.cookie(env.sessionCookieName, result.sessionToken, {
      ...sessionCookieOptions,
      maxAge: env.sessionTtlMs,
    });

    res.status(201).json({
      ok: true,
      data: {
        sessionToken: result.sessionToken,
        session: result.session,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/session', (req, res) => {
  res.json({
    ok: true,
    data: {
      authenticated: !!req.authSession,
      session: req.authSession ?? null,
    },
  });
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await authService.revokeSession(req.authToken);
    res.clearCookie(env.sessionCookieName, {
      ...sessionCookieOptions,
    });
    res.json({
      ok: true,
      data: {
        loggedOut: true,
      },
    });
  } catch (error) {
    next(new AppError(500, error instanceof Error ? error.message : 'Logout failed', 'LOGOUT_FAILED'));
  }
});
