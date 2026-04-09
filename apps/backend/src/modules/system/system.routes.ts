import { Router } from 'express';

export const systemRouter = Router();

systemRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  });
});
