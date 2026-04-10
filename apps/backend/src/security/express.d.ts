import type { AuthSession } from './auth-session.js';

declare global {
  namespace Express {
    /**
     * 扩展 Express Request，让安全层和中间件可以共享请求上下文。
     */
    interface Request {
      authSession?: AuthSession;
      authToken?: string;
      requestId?: string;
    }
  }
}

export {};
