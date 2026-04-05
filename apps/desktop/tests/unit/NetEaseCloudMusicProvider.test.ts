import { describe, test, expect, beforeEach } from 'vitest';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { testLogger } from '../logger';

describe('NetEaseCloudMusic Provider (Live)', () => {
  let provider: NetEaseCloudMusic;

  beforeEach(() => {
    provider = new NetEaseCloudMusic(testLogger);
  });

  test('searchTrack should return real results', async () => {
    const tracks = await provider.searchTrack('锦鲤抄');
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks[0].title).toBeDefined();
    expect(tracks[0].artist).toBeDefined();
    console.log('First track found:', tracks[0].title, 'by', tracks[0].artist);
  }, 20000);

  test('getLyrics should return real lyrics', async () => {
    // Using a known song ID: 186016 (周杰伦 - 晴天)
    const lyric = await provider.getLyrics('186016');
    expect(lyric.isValid()).toBe(true);
    expect(lyric.originLines.length).toBeGreaterThan(0);
    console.log('Lyric lines:', lyric.originLines.length);
  }, 20000);

  test('getTrackLink might return a URL or null', async () => {
     // Using a known song ID: 186016 (周杰伦 - 晴天)
    const url = await provider.getTrackLink('186016');
    console.log('Track link:', url);
    if (url) {
      expect(url.startsWith('http')).toBe(true);
    } else {
      console.log('Note: Track link is null (common for some regions/IPs)');
    }
  }, 20000);

  test('search should return tracks and playlists', async () => {
    const result = await provider.search('周杰伦');
    expect(result.track_result.length).toBeGreaterThan(0);
    expect(result.playlist_result.length).toBeGreaterThan(0);
    console.log('Tracks:', result.track_result.length, 'Playlists:', result.playlist_result.length);
  }, 20000);
});
