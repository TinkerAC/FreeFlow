import express from 'express';
import { applyCors } from './http/middleware/cors.js';
import { errorHandler, notFoundHandler } from './http/middleware/error-handler.js';
import { attachRequestContext } from './http/middleware/request-context.js';
import { registerHttpRoutes } from './http/routes/index.js';

/**
 * 创建并装配 Express 应用实例。
 * 这里负责全局中间件顺序和路由挂载，不承载任何具体业务逻辑。
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(attachRequestContext);
  app.use(applyCors);
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));

  registerHttpRoutes(app);

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
