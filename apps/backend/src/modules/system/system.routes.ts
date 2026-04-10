import { Router } from 'express';
import { toAppError } from '../../core/errors/app-error.js';
import { checkDatabaseHealth } from '../../infra/database/prisma.js';

/**
 * 系统级接口，主要用于健康检查和运维探针。
 */
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
