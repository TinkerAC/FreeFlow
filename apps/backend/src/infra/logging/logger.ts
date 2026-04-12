import os from 'node:os';
import { Writable } from 'node:stream';
import {
  pino,
  stdSerializers,
  stdTimeFunctions,
  type Logger as PinoLogger,
} from 'pino';
import { env } from '../../config/env.js';

export type LogFields = Record<string, unknown>;
export type ScopedLogger = PinoLogger;

const FIXED_LOG_KEYS = new Set([
  'time',
  'level',
  'message',
  'msg',
  'scope',
  'service',
  'environment',
  'pid',
  'hostname',
]);

const DETAIL_FIELD_PRIORITY = [
  'requestId',
  'method',
  'path',
  'statusCode',
  'durationMs',
  'contentLength',
  'ip',
  'userId',
  'errorCode',
  'err',
  'details',
] as const;

const MAX_TEXT_FIELD_LENGTH = 200;
const MAX_JSON_FIELD_LENGTH = 320;
const MAX_MESSAGE_LENGTH = 260;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

function toJsonSafely(value: unknown) {
  try {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? '"[unserializable]"' : encoded;
  } catch {
    return '"[unserializable]"';
  }
}

function summarizeError(value: unknown, level: string) {
  if (!value || typeof value !== 'object') {
    return truncate(collapseWhitespace(String(value)), MAX_TEXT_FIELD_LENGTH);
  }

  const errorRecord = value as Record<string, unknown>;
  const name =
    (typeof errorRecord.type === 'string' && errorRecord.type) ||
    (typeof errorRecord.name === 'string' && errorRecord.name) ||
    'Error';
  const messageRaw = typeof errorRecord.message === 'string' ? errorRecord.message : '';
  const message = truncate(collapseWhitespace(messageRaw), MAX_TEXT_FIELD_LENGTH);
  if (!message) return name;

  if (level === 'debug' || level === 'trace') {
    const stack = typeof errorRecord.stack === 'string' ? errorRecord.stack : '';
    const stackLine = collapseWhitespace(stack.split('\n')[1] ?? '');
    if (stackLine) {
      return truncate(`${name}: ${message} @ ${stackLine}`, MAX_JSON_FIELD_LENGTH);
    }
  }

  return `${name}: ${message}`;
}

function formatTime(timeValue: unknown) {
  if (typeof timeValue !== 'string') return '00:00:00';

  const time = new Date(timeValue);
  if (Number.isNaN(time.getTime())) return '00:00:00';

  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function formatFieldValue(field: string, value: unknown, level: string): string {
  if (value === undefined) return '';
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') {
    const compact = truncate(collapseWhitespace(value), MAX_TEXT_FIELD_LENGTH);
    if (/^[A-Za-z0-9._:/@-]+$/.test(compact)) return compact;
    return JSON.stringify(compact);
  }

  if (field === 'err' || field === 'error') {
    const summary = summarizeError(value, level);
    if (/^[A-Za-z0-9._:/@ -]+$/.test(summary)) return summary;
    return JSON.stringify(summary);
  }

  if (field === 'details' && Array.isArray(value)) {
    const compactDetails = collapseWhitespace(toJsonSafely(value));
    return truncate(compactDetails, MAX_JSON_FIELD_LENGTH);
  }

  const compactJson = collapseWhitespace(toJsonSafely(value));
  return truncate(compactJson, MAX_JSON_FIELD_LENGTH);
}

function formatDetails(record: Record<string, unknown>, level: string) {
  const keys = Object.keys(record).filter((key) => !FIXED_LOG_KEYS.has(key) && record[key] !== undefined);
  if (keys.length === 0) return '';

  keys.sort((left, right) => {
    const leftPriority = DETAIL_FIELD_PRIORITY.indexOf(left as typeof DETAIL_FIELD_PRIORITY[number]);
    const rightPriority = DETAIL_FIELD_PRIORITY.indexOf(right as typeof DETAIL_FIELD_PRIORITY[number]);
    if (leftPriority === -1 && rightPriority === -1) return left.localeCompare(right);
    if (leftPriority === -1) return 1;
    if (rightPriority === -1) return -1;
    return leftPriority - rightPriority;
  });

  return keys
    .map((key) => `${key}=${formatFieldValue(key, record[key], level)}`)
    .join(' ');
}

class PrettyStructuredStream extends Writable {
  private pending = '';

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ) {
    this.pending += chunk.toString();

    const lines = this.pending.split('\n');
    this.pending = lines.pop() ?? '';

    for (const line of lines) {
      this.writeFormattedLine(line);
    }

    callback();
  }

  override _final(callback: (error?: Error | null) => void) {
    if (this.pending) {
      this.writeFormattedLine(this.pending);
    }
    callback();
  }

  private writeFormattedLine(rawLine: string) {
    const line = rawLine.trim();
    if (!line) return;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(line) as Record<string, unknown>;
    } catch {
      process.stdout.write(`${line}\n`);
      return;
    }

    const time = formatTime(parsed.time);
    const level = typeof parsed.level === 'string' ? parsed.level : 'info';
    const scope = typeof parsed.scope === 'string' ? parsed.scope : 'app';
    const messageRaw =
      typeof parsed.message === 'string'
        ? parsed.message
        : typeof parsed.msg === 'string'
          ? parsed.msg
          : '';
    const message = truncate(collapseWhitespace(messageRaw || '-'), MAX_MESSAGE_LENGTH);
    const details = formatDetails(parsed, level);
    const output = `${time} [${level}] [${scope}]: ${message}${details ? ` | ${details}` : ''}\n`;
    const stream = level === 'fatal' || level === 'error' ? process.stderr : process.stdout;

    stream.write(output);
  }
}

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
}, new PrettyStructuredStream());

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
