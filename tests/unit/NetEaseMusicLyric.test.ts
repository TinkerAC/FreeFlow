import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { Platform } from '@main/core/enum/Platform';
import axios from 'axios';
import { testLogger } from '../logger';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

describe('NetEaseCloudMusic Provider', () => {
  let provider: NetEaseCloudMusic;
  beforeEach(() => {
    provider = new NetEaseCloudMusic(testLogger);
    mockedGet.mockReset();
  });

  test('platformName & serverNodes 基本可用性', () => {
    expect(provider.platformName).toBe(Platform.NET_EASE_CLOUD_MUSIC);
    expect(Array.isArray(provider.serverNodes)).toBe(true);
    expect(provider.serverNodes.length).toBeGreaterThan(0);
  });

  test('searchTracks 过滤付费歌曲', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          songs: [
            { id: 1, name: 'free0', fee: 0, ar: [{ name: 'A' }], al: { name: 'AL', picUrl: 'cover1' }, dt: 1000 },
            { id: 2, name: 'free8', fee: 8, ar: [{ name: 'B' }], al: { name: 'AL', picUrl: 'cover2' }, dt: 2000 },
            { id: 3, name: 'paid', fee: 1, ar: [{ name: 'C' }], al: { name: 'AL', picUrl: 'cover3' }, dt: 3000 },
          ],
          playlists: [],
        },
      },
    });

    const tracks = await provider.searchTrack('k');
    expect(tracks.map(t => t.title)).toEqual(['free0', 'free8']);
  });

  test('getTrackLink 返回正确播放链接', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { code: 200, data: [{ url: 'http://audio.example/123.mp3' }] },
    });
    const url = await provider.getTrackLink('123');
    expect(url).toBe('http://audio.example/123.mp3');
  });

  test('getLyrics 解析三段歌词并按时间排序去重合并', async () => {
    const origin = '[00:00.00]标题\n[00:01.00]第一行\n[00:01.00]第一行重复';
    const translation = '[00:01.00]line1 trans';
    const pronunciation = '[00:01.00]line1 pron';
    mockedGet.mockResolvedValueOnce({
      data: { lrc: { lyric: origin }, tlyric: { lyric: translation }, romalrc: { lyric: pronunciation } },
    });
    const lyric = await provider.getLyrics('999');
    expect(lyric.originLines.length).toBe(2); // 合并同一时间戳
    expect(lyric.originLines[1].text).toBe('第一行 / 第一行重复');
    expect(lyric.translationLines[0].text).toContain('trans');
    expect(lyric.pronunciationLines[0].text).toContain('pron');
  });

  test('search 聚合 tracks + playlists', async () => {
    // cloudsearch for tracks & playlists (第一请求: searchTracks)
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          songs: [{
            id: 10,
            name: 'SongX',
            fee: 0,
            ar: [{ name: 'AA' }],
            al: { name: 'AL', picUrl: '' },
            dt: 1000,
          }], playlists: [{ id: 77, name: 'List1', coverImgUrl: 'c', creator: { nickname: 'U' }, description: 'desc' }],
        },
      },
    });
    // cloudsearchPlaylist (第二次 cloudsearch 请求 - 复用前端逻辑, 这里再次返回 playlists)
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          playlists: [{
            id: 77,
            name: 'List1',
            coverImgUrl: 'c',
            creator: { nickname: 'U' },
            description: 'desc',
          }],
        },
      },
    });
    const fusion = await provider.search('keyword');
    expect(fusion.track_result.length).toBe(1);
    expect(fusion.playlist_result.length).toBe(1);
    expect(fusion.playlist_result[0].title).toBe('List1');
  });
});

