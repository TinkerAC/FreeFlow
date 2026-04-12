import { PrismaClient, type Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { createScopedLogger } from '../logging/logger.js';

const databaseLogger = createScopedLogger('infra.database.prisma');

const prismaOptions = {
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
} as const satisfies Prisma.PrismaClientOptions;

type LoggingPrismaClient = PrismaClient<typeof prismaOptions>;

type GlobalWithPrisma = typeof globalThis & {
  __freeflowPrisma?: LoggingPrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

/**
 * 开发环境下复用 PrismaClient，避免热重载或重复导入导致连接数量失控。
 */
export const prisma =
  globalWithPrisma.__freeflowPrisma ??
  new PrismaClient(prismaOptions);

if (env.nodeEnv !== 'production') {
  globalWithPrisma.__freeflowPrisma = prisma;
}

prisma.$on('warn', (event) => {
  databaseLogger.warn({
    target: event.target,
  }, event.message);
});

prisma.$on('error', (event) => {
  databaseLogger.error({
    target: event.target,
  }, event.message);
});

prisma.$on('query', (event) => {
  if (!env.logPrismaQueries) return;

  databaseLogger.debug({
    query: event.query,
    params: event.params,
    durationMs: event.duration,
    target: event.target,
  }, 'prisma query executed');
});

/**
 * 启动时显式建立连接，让数据库异常尽早暴露。
 */
export async function connectDatabase() {
  const startedAt = process.hrtime.bigint();
  await prisma.$connect();
  databaseLogger.info({
    durationMs: Number((Number(process.hrtime.bigint() - startedAt) / 1_000_000).toFixed(2)),
  }, 'database connected');
}

/**
 * 关闭服务时释放连接，避免进程悬挂。
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
  databaseLogger.info('database disconnected');
}

/**
 * 健康检查只验证数据库链路本身，不混入额外业务逻辑。
 */
export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
}
