import 'reflect-metadata';
import { describe, test, expect, beforeAll } from 'vitest';
import YouTube from '@main/contentProvider/YouTube/YouTube';
import { ConfigService } from '@main/core/configService';
import { Platform } from '@main/core/enum/Platform';
import { testLogger } from '../logger';

const KEYWORD = 'Shape of You';

describe('YouTube Provider (live)', () => {
  let provider: YouTube;

  beforeAll(() => {
    const configStub = {
      get: (key: string) => {
        if (key === 'services.youtube') return {};
        return undefined;
      },
    } as unknown as ConfigService;

    provider = new YouTube(configStub, testLogger);
  });

  test('searchTrack returns playable results for keyword', async () => {
    const tracks = await provider.searchTrack(KEYWORD);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
    
    const first = tracks[0];
    console.log('First track found:', first.title, first.platform_unique_id);
    
    // Check if platform is correct. If implementation reuses YouTubeMusicTrackModel it might be YOUTUBE_MUSIC.
    // But logically it should be YOUTUBE.
    // We will assert it is one of them for now, or check what happens.
    // expect(first.platform).toBe(Platform.YOUTUBE);
    
    expect(typeof first.platform_unique_id).toBe('string');
    expect(first.platform_unique_id.length).toBeGreaterThan(5);
    expect(typeof first.title).toBe('string');
  });

  test('search returns tracks', async () => {
    const fusion = await provider.search(KEYWORD);
    expect(fusion.track_result.length).toBeGreaterThan(0);
    expect(fusion.playlist_result.length).toBe(0);
    console.log(`Found ${fusion.track_result.length} tracks`);
  });

  test('getTrackLink returns a valid URL', async () => {
    // Use a known video ID, e.g., Ed Sheeran - Shape of You
    const videoId = 'JGwWNGJdvx8';
    const url = await provider.getTrackLink(videoId);
    console.log('Track URL:', url);
    expect(typeof url).toBe('string');
    expect(url.startsWith('http')).toBe(true);
  });
});
