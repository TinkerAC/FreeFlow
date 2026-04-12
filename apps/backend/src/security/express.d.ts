import type { AuthSession } from './auth-session.js';
import type { ScopedLogger } from '../infra/logging/logger.js';

declare global {
  namespace Express {
    /**
     * 扩展 Express Request，让安全层和中间件可以共享请求上下文。
     */
    interface Request {
      authSession?: AuthSession;
      authToken?: string;
      requestId?: string;
      logger?: ScopedLogger;
    }
  }
}

export {};
