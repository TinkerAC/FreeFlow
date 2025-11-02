import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { testLogger } from '../logger';

const logger = testLogger;
describe('QQMusic Provider', () => {
  let provider: QQMusic;
  beforeEach(() => {
    provider = new QQMusic(logger);
  });

  test('搜索曲目', async () => {
    const tracks = await provider.searchTrack('光辉岁月');
    console.log(tracks);
    expect(tracks.length).toBeGreaterThan(0);//预期搜索结果不为空
  });


  test('获取歌词', async () => {

    const lyric = await provider.getLyrics('003rJSwm3TechU');
    console.log(lyric);
    expect(lyric.isValid).toBeTruthy;//反回的歌词预期是有效的
  });
});
