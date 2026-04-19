import { describe, expect, test } from 'vitest';
import {
  buildFreeFlowLyricsMetadata,
  parseFreeFlowLyricsMetadata,
} from '../../src/shared/metadata/freeflowLyrics';

describe('freeflowLyrics metadata helpers', () => {
  test('builds LRC metadata from plain lyrics', () => {
    const metadata = buildFreeFlowLyricsMetadata('hello\nworld', { durationSec: 10 });

    expect(metadata).toMatchObject({
      standard: 'LRC',
      version: '1.0',
      language: 'und',
      synchronized: false,
    });
    expect(metadata?.text).toContain('[00:00.00]hello');
    expect(metadata?.text).toContain('[00:05.00]world');
  });

  test('parses LRC metadata into lyric lines', () => {
    const lines = parseFreeFlowLyricsMetadata({
      standard: 'LRC',
      version: '1.0',
      language: 'und',
      synchronized: true,
      text: '[00:01.20]first\n[00:03.45]second',
    });

    expect(lines).toEqual([
      { time: 1200, text: 'first' },
      { time: 3450, text: 'second' },
    ]);
  });
});
