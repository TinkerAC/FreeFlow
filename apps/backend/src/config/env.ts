import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { AppError } from '../lib/app-error.js';

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
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
};

loadEnvFile(new URL('../../.env', import.meta.url));

const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean());

const csvString = z.preprocess((value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()));

const csvNumber = z.preprocess((value) => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
}, z.array(z.number().int().positive()));

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  HOST: z.string().default('0.0.0.0'),
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

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  host: parsed.data.HOST,
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
  pinataJwt: parsed.data.PINATA_JWT,
  pinataApiBaseUrl: parsed.data.PINATA_API_BASE_URL,
  pinataGatewayBaseUrl: parsed.data.PINATA_GATEWAY_BASE_URL,
  pinataNetwork: parsed.data.PINATA_NETWORK,
  pinataGroupId: parsed.data.PINATA_GROUP_ID?.trim() || undefined,
  uploadMaxFileSizeBytes: parsed.data.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024,
} as const;
