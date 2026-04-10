import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infra/database/prisma.js';
import { startAuthMaintenance, stopAuthMaintenance } from './modules/auth/auth.maintenance.js';

/**
 * 启动入口只负责基础设施生命周期管理：
 * 数据库连接、后台任务、HTTP 服务监听和优雅停机。
 */
async function main() {
  let shuttingDown = false;

  await connectDatabase();
  startAuthMaintenance();

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    console.log(
      `[freeflow-web25-backend] listening on http://${env.host}:${env.port}`,
    );
  });

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[freeflow-web25-backend] received ${signal}, shutting down`);
    stopAuthMaintenance();

    server.close((serverError) => {
      void disconnectDatabase()
        .catch((databaseError) => {
          console.error('[freeflow-web25-backend] database disconnect failed', databaseError);
        })
        .finally(() => {
          if (serverError) {
            console.error('[freeflow-web25-backend] HTTP shutdown failed', serverError);
            process.exit(1);
          }
          process.exit(0);
        });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (error) => {
  console.error('[freeflow-web25-backend] startup failed', error);
  stopAuthMaintenance();
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
