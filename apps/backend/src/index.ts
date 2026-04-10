import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './lib/prisma.js';

async function main() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.port, env.host, () => {
    console.log(
      `[freeflow-web25-backend] listening on http://${env.host}:${env.port}`,
    );
  });

  const shutdown = (signal: string) => {
    console.log(`[freeflow-web25-backend] received ${signal}, shutting down`);

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
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
