import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

type GlobalWithPrisma = typeof globalThis & {
  __freeflowPrisma?: PrismaClient;
};

const globalWithPrisma = globalThis as GlobalWithPrisma;

export const prisma =
  globalWithPrisma.__freeflowPrisma ??
  new PrismaClient({
    log: env.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.nodeEnv !== 'production') {
  globalWithPrisma.__freeflowPrisma = prisma;
}

export async function connectDatabase() {
  await prisma.$connect();
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export async function checkDatabaseHealth() {
  await prisma.$queryRaw`SELECT 1`;
}
