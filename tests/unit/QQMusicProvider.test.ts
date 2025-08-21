import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { Platform } from '@main/core/enum/Platform';
import axios from 'axios';

jest.mock('axios');
const mockedGet = axios.get as jest.Mock;

function buildSong({ songmid, payplay }: { songmid: string; payplay: number }) {
  return {
    songmid,
    songname: 'Title-' + songmid,
    albumname: 'Album-' + songmid,
    albummid: 'COVER' + songmid,
    singer: [{ id: 1, mid: 'x', name: 'Artist' }],
    interval: 123,
    pubtime: 1700000000,
    pay: { payplay, payalbum: 0, payalbumprice: 0, paydownload: 0, payinfo: 0, paytrackmouth: 0, paytrackprice: 0 },
  };
}

describe('QQMusic Provider', () => {
  let provider: QQMusic;
  beforeEach(() => {
    provider = new QQMusic();
    mockedGet.mockReset();
  });

  test('platformName/serverNodes', () => {
    expect(provider.platformName).toBe(Platform.QQ_MUSIC);
    expect(provider.serverNodes.length).toBeGreaterThan(0);
  });

  test('searchTracks 过滤付费歌曲', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        response: {
          data: {
            song: { list: [buildSong({ songmid: 'F0', payplay: 0 }), buildSong({ songmid: 'F1', payplay: 1 })] },
          },
        },
      },
    });
    const tracks = await provider.searchTracks('k');
    expect(tracks.length).toBe(1);
    expect(tracks[0].platform_unique_id).toBe('F0');
  });

  test('getTrackLink 返回播放链接', async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { playUrl: { ID123: { url: 'https://qq.test/ID123.mp3', error: false } } } } });
    const url = await provider.getTrackLink('ID123');
    expect(url).toBe('https://qq.test/ID123.mp3');
  });

  test('getLyrics 解析 LRC 行', async () => {
    mockedGet.mockResolvedValueOnce({ data: { code: 0, response: { lyric: '[00:01.00]Hello World' } } });
    const lyric = await provider.getLyrics('ID123');
    expect(lyric).toBeDefined();
    if (!lyric) return; // 保障类型收窄
    expect(lyric.originLines[0].text).toBe('Hello World');
    expect(lyric.originLines[0].time).toBeGreaterThan(900);
  });
});
