import 'reflect-metadata';
import { describe, test, expect, beforeAll } from 'vitest';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { ConfigService } from '@main/core/configService';
import { Platform } from '@main/core/enum/Platform';
import { testLogger } from '../logger';

const KEYWORD = 'Shape of You';

describe('YouTubeMusic Provider (live)', () => {
  let provider: YouTubeMusic;

  beforeAll(() => {
    const configStub = {
      get: (key: string) => {
        if (key === 'services.youtubeMusic') return {};
        return undefined;
      },
    } as unknown as ConfigService;

    provider = new YouTubeMusic(configStub, testLogger);
  });

  test('searchTrack returns playable results for keyword', async () => {
    const tracks = await provider.searchTrack(KEYWORD);
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks.length).toBeGreaterThan(0);
    
    const first = tracks[0];
    console.log('First track found:', first.title, first.platform_unique_id);
    
    expect(first.platform).toBe(Platform.YOUTUBE_MUSIC);
    expect(typeof first.platform_unique_id).toBe('string');
    expect(first.platform_unique_id.length).toBeGreaterThan(5);
    expect(typeof first.title).toBe('string');
  });

  test('search returns both tracks and playlists', async () => {
    const fusion = await provider.search(KEYWORD);
    expect(fusion.track_result.length).toBeGreaterThan(0);
    expect(fusion.playlist_result.length).toBeGreaterThan(0);
    console.log(`Found ${fusion.track_result.length} tracks and ${fusion.playlist_result.length} playlists`);
  });
});
