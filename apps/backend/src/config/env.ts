import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { AppError } from '../core/errors/app-error.js';

/**
 * 以最小依赖读取 `.env` 文件。
 * 这里只做兼容性足够的解析，避免在基础配置阶段再引入额外运行时依赖。
 */
const loadEnvFile = (fileUrl: URL) => {
  if (!existsSync(fileUrl)) return;

  const content = readFileSync(fileUrl, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith('\'') && value.endsWith('\'')))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadEnvFile(new URL('../../.env', import.meta.url));

/**
 * 统一解析布尔环境变量，兼容常见的文本写法。
 */
const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean());

/**
 * 将逗号分隔的字符串解析成字符串数组。
 */
const csvString = z.preprocess((value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));

/**
 * 将逗号分隔的字符串解析成正整数数组。
 */
const csvNumber = z.preprocess((value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}, z.array(z.number().int().positive()));

/**
 * 所有后端运行参数都在这里做集中校验。
 * 启动即失败要比运行中带着错误配置继续工作安全得多。
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LOG_PRISMA_QUERIES: boolFromEnv.default(false),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ALLOWED_ORIGINS: csvString.default(['http://localhost:5173', 'http://localhost:3000', 'null']),
  ALLOW_NULL_ORIGIN: boolFromEnv.default(true),
  SIWE_DOMAIN: z.string().min(1).default('freeflow.local'),
  SIWE_URI: z.string().url().default('https://freeflow.local/web2.5'),
  SIWE_STATEMENT: z.string().min(1).default('Sign in to FreeFlow Web2.5 services.'),
  SIWE_ALLOWED_CHAIN_IDS: csvNumber.default([11155111]),
  NONCE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(60 * 60 * 24 * 7),
  SESSION_COOKIE_NAME: z.string().min(1).default('ff_web25_session'),
  COOKIE_SECURE: boolFromEnv.default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  IMGUR_CLIENT_ID: z.string().trim().min(1).optional(),
  PINATA_JWT: z.string().min(1, 'PINATA_JWT is required'),
  PINATA_API_BASE_URL: z.string().url().default('https://uploads.pinata.cloud/v3/files'),
  PINATA_GATEWAY_BASE_URL: z.string().url().default('https://gateway.pinata.cloud/ipfs'),
  PINATA_NETWORK: z.enum(['public', 'private']).default('public'),
  PINATA_GROUP_ID: z.string().optional(),
  UPLOAD_MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(150),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new AppError(500, `Invalid backend environment: ${issues}`, 'INVALID_ENVIRONMENT');
}

/**
 * 对外只暴露已经归一化过的配置，业务代码不再直接读取 `process.env`。
 */
export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  logLevel: parsed.data.LOG_LEVEL,
  logPrismaQueries: parsed.data.LOG_PRISMA_QUERIES,
  port: parsed.data.PORT,
  host: parsed.data.HOST,
  databaseUrl: parsed.data.DATABASE_URL,
  allowedOrigins: parsed.data.ALLOWED_ORIGINS,
  allowNullOrigin: parsed.data.ALLOW_NULL_ORIGIN,
  siweDomain: parsed.data.SIWE_DOMAIN,
  siweUri: parsed.data.SIWE_URI,
  siweStatement: parsed.data.SIWE_STATEMENT,
  allowedChainIds: parsed.data.SIWE_ALLOWED_CHAIN_IDS,
  nonceTtlMs: parsed.data.NONCE_TTL_SECONDS * 1000,
  sessionTtlMs: parsed.data.SESSION_TTL_SECONDS * 1000,
  sessionCookieName: parsed.data.SESSION_COOKIE_NAME,
  cookieSecure: parsed.data.COOKIE_SECURE,
  cookieSameSite: parsed.data.COOKIE_SAME_SITE,
  imgurClientId: parsed.data.IMGUR_CLIENT_ID?.trim() || undefined,
  pinataJwt: parsed.data.PINATA_JWT,
  pinataApiBaseUrl: parsed.data.PINATA_API_BASE_URL,
  pinataGatewayBaseUrl: parsed.data.PINATA_GATEWAY_BASE_URL,
  pinataNetwork: parsed.data.PINATA_NETWORK,
  pinataGroupId: parsed.data.PINATA_GROUP_ID?.trim() || undefined,
  uploadMaxFileSizeBytes: parsed.data.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
} as const;
