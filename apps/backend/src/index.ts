import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infra/database/prisma.js';
import { createScopedLogger, toErrorLogField } from './infra/logging/logger.js';
import { startAuthMaintenance, stopAuthMaintenance } from './modules/auth/auth.maintenance.js';

const lifecycleLogger = createScopedLogger('app.lifecycle');

process.on('uncaughtException', (error) => {
  lifecycleLogger.fatal(toErrorLogField(error), 'uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  lifecycleLogger.fatal(toErrorLogField(reason), 'unhandled rejection');
});

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
    lifecycleLogger.info({
      host: env.host,
      port: env.port,
      url: `http://${env.host}:${env.port}`,
    }, 'server listening');
  });

  server.on('error', (error) => {
    lifecycleLogger.fatal(toErrorLogField(error), 'http server failed');
    stopAuthMaintenance();
    void disconnectDatabase().finally(() => process.exit(1));
  });

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    lifecycleLogger.info({ signal }, 'shutdown signal received');
    stopAuthMaintenance();

    server.close((serverError) => {
      void disconnectDatabase()
        .catch((databaseError) => {
          lifecycleLogger.error(toErrorLogField(databaseError), 'database disconnect failed');
        })
        .finally(() => {
          if (serverError) {
            lifecycleLogger.error(toErrorLogField(serverError), 'http shutdown failed');
            process.exit(1);
          }
          lifecycleLogger.info('shutdown completed');
          process.exit(0);
        });
    });
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(async (error) => {
  lifecycleLogger.fatal(toErrorLogField(error), 'startup failed');
  stopAuthMaintenance();
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
