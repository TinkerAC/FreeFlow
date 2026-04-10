import { Router } from 'express';
import { checkDatabaseHealth } from '../../lib/prisma.js';
import { toAppError } from '../../lib/app-error.js';

export const systemRouter = Router();

systemRouter.get('/health', async (_req, res, next) => {
  try {
    await checkDatabaseHealth();
    res.json({
      ok: true,
      data: {
        status: 'healthy',
        database: 'up',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(toAppError(error));
  }
});
