import type { Express } from 'express';
import { authRouter } from '../../modules/auth/auth.routes.js';
import { pinataRouter } from '../../modules/pinata/pinata.routes.js';
import { releaseRouter } from '../../modules/releases/release.routes.js';
import { systemRouter } from '../../modules/system/system.routes.js';

/**
 * 集中注册所有 HTTP 路由挂载点。
 * `app.ts` 只关心中间件装配顺序，具体业务路由入口统一在这里维护。
 */
export function registerHttpRoutes(app: Express) {
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/storage/pinata', pinataRouter);
  app.use('/api/v1/releases', releaseRouter);
  app.use('/api/v1/system', systemRouter);
}
