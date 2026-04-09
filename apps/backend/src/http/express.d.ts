import type { AuthSession } from '../modules/auth/auth.types.js';

declare global {
  namespace Express {
    interface Request {
      authSession?: AuthSession;
      authToken?: string;
      requestId?: string;
    }
  }
}

export {};
