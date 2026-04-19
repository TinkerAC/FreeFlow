import type { LyricLine } from '@src/shared/domainModel/lyricLine';

export const FREEFLOW_LYRICS_STANDARD = 'LRC';
export const FREEFLOW_LYRICS_VERSION = '1.0';

export type FreeFlowLyricsMetadata = {
  standard: typeof FREEFLOW_LYRICS_STANDARD;
  version: typeof FREEFLOW_LYRICS_VERSION;
  language: string;
  synchronized: boolean;
  text: string;
};

const LRC_TIMESTAMP_PATTERN = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

function isLrcText(value: string) {
  LRC_TIMESTAMP_PATTERN.lastIndex = 0;
  return LRC_TIMESTAMP_PATTERN.test(value);
}

function normalizeLyricsLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatLrcTimestamp(timeMs: number) {
  const safeMs = Math.max(0, Math.round(timeMs));
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((safeMs % 1000) / 10);
  return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}]`;
}

export function buildFreeFlowLyricsMetadata(
  lyricsText: string,
  input: {
    language?: string;
    durationSec?: number | null;
  } = {},
): FreeFlowLyricsMetadata | null {
  const normalized = lyricsText.trim();
  if (!normalized) return null;

  if (isLrcText(normalized)) {
    return {
      standard: FREEFLOW_LYRICS_STANDARD,
      version: FREEFLOW_LYRICS_VERSION,
      language: input.language || 'und',
      synchronized: true,
      text: normalized,
    };
  }

  const lines = normalizeLyricsLines(normalized);
  if (!lines.length) return null;

  const durationMs = typeof input.durationSec === 'number' && Number.isFinite(input.durationSec) && input.durationSec > 0
    ? Math.round(input.durationSec * 1000)
    : null;
  const intervalMs = durationMs && lines.length > 1
    ? Math.max(1000, Math.floor(durationMs / lines.length))
    : 5000;

  return {
    standard: FREEFLOW_LYRICS_STANDARD,
    version: FREEFLOW_LYRICS_VERSION,
    language: input.language || 'und',
    synchronized: false,
    text: lines.map((line, index) => `${formatLrcTimestamp(index * intervalMs)}${line}`).join('\n'),
  };
}

function parseTimestamp(minutesRaw: string, secondsRaw: string, fractionRaw?: string) {
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  const fraction = fractionRaw
    ? Number((fractionRaw + '000').slice(0, 3))
    : 0;
  if (!Number.isFinite(fraction)) return null;

  return (minutes * 60 + seconds) * 1000 + fraction;
}

function parseLrcText(text: string): LyricLine[] {
  const lines: LyricLine[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    LRC_TIMESTAMP_PATTERN.lastIndex = 0;
    const matches = Array.from(rawLine.matchAll(LRC_TIMESTAMP_PATTERN));
    if (!matches.length) continue;

    const lyricText = rawLine.replace(LRC_TIMESTAMP_PATTERN, '').trim();
    if (!lyricText) continue;

    for (const match of matches) {
      const time = parseTimestamp(match[1], match[2], match[3]);
      if (time === null) continue;
      lines.push({ time, text: lyricText });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

export function parseFreeFlowLyricsMetadata(value: unknown): LyricLine[] {
  if (typeof value === 'string') {
    const metadata = buildFreeFlowLyricsMetadata(value);
    return metadata ? parseLrcText(metadata.text) : [];
  }

  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const standard = String(record.standard ?? '').toUpperCase();
  const text = typeof record.text === 'string' ? record.text.trim() : '';
  if (standard !== FREEFLOW_LYRICS_STANDARD || !text) return [];

  return parseLrcText(text);
}
