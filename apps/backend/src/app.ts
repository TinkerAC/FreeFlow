import express from 'express';
import { authRouter } from './modules/auth/auth.routes.js';
import { pinataRouter } from './modules/pinata/pinata.routes.js';
import { systemRouter } from './modules/system/system.routes.js';
import { applyCors } from './http/middleware/cors.js';
import { attachRequestContext } from './http/middleware/request-context.js';
import { errorHandler, notFoundHandler } from './http/middleware/error-handler.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(attachRequestContext);
  app.use(applyCors);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/storage/pinata', pinataRouter);
  app.use('/api/v1/system', systemRouter);

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      service: 'freeflow-web25-backend',
      version: '0.1.0',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
