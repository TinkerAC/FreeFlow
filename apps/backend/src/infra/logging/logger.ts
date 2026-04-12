import os from 'node:os';
import {
  pino,
  stdSerializers,
  stdTimeFunctions,
  type Logger as PinoLogger,
} from 'pino';
import { env } from '../../config/env.js';

export type LogFields = Record<string, unknown>;
export type ScopedLogger = PinoLogger;

const rootLogger = pino({
  level: env.logLevel,
  messageKey: 'message',
  timestamp: stdTimeFunctions.isoTime,
  base: {
    service: 'freeflow-web25-backend',
    environment: env.nodeEnv,
    pid: process.pid,
    hostname: os.hostname(),
  },
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  serializers: {
    err: stdSerializers.err,
    error: stdSerializers.err,
  },
  redact: {
    paths: [
      'authorization',
      'cookie',
      'headers.authorization',
      'headers.cookie',
      'pinataJwt',
      '*.pinataJwt',
      '*.sessionToken',
      'sessionToken',
      'authToken',
      '*.authToken',
    ],
    censor: '[redacted]',
  },
});

export function createScopedLogger(scope: string, fields: LogFields = {}) {
  return rootLogger.child({
    scope,
    ...fields,
  });
}

export function createChildLogger(parent: ScopedLogger, scope: string, fields: LogFields = {}) {
  return parent.child({
    scope,
    ...fields,
  });
}

export function toErrorLogField(error: unknown) {
  if (error instanceof Error) return { err: error };
  return { err: { message: String(error) } };
}

export const logger = createScopedLogger('app');
