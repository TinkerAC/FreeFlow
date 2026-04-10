import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';

type GlobalWithPrisma = typeof globalThis & {
  __freeflowPrisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

/**
 * 开发环境下复用 PrismaClient，避免热重载或重复导入导致连接数量失控。
 */
export const prisma =
  globalWithPrisma.__freeflowPrisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalWithPrisma.__freeflowPrisma = prisma;
}

/**
 * 启动时显式建立连接，让数据库异常尽早暴露。
 */
export async function connectDatabase() {
  await prisma.$connect();
}

/**
 * 关闭服务时释放连接，避免进程悬挂。
 */
export async function disconnectDatabase() {
  await prisma.$disconnect();
}

/**
 * 健康检查只验证数据库链路本身，不混入额外业务逻辑。
 */
export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
}
