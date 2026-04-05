import { describe, expect, test } from 'vitest';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { testLogger } from '../logger';

const logger = testLogger;
describe('QQMusic Provider (Live)', () => {
  let provider: QQMusic;
  beforeAll(() => {
    provider = new QQMusic(logger);
  });

  test('搜索曲目 should return real results', async () => {

    const keyword:string = "国歌"
    // '光辉岁月'
    const result = await provider.search(keyword);

    const tracks = result.track_result;
    expect(tracks.length).toBeGreaterThan(0);
    expect(tracks[0].title).toBeDefined();
    expect(tracks[0].artist).toBeDefined();
    console.log('First track found:', tracks[0].title, 'by', tracks[0].artist);
  }, 20000);


  test('获取歌词 should return real lyrics', async () => {
    // Using a known QQMusic ID for 光辉岁月: 003rJSwm3TechU

    const lyric = await provider.getLyrics('003rJSwm3TechU');

    expect(lyric.originLines.length).toBeGreaterThan(0);
    console.log('Lyric lines:', lyric.originLines.length);

  }, 20000);

  test('获取播放链接 should return real link', async () => {

    // - The Right Path（Age Of Innocence）-uid: 0008dOVc2ImmJP
    // - 义勇军进行曲 (合唱)（标准礼仪曲集）-uid: 003h45Yk3yWjLk
    const url:string = await provider.getTrackLink('003h45Yk3yWjLk');

    expect(url).toBeDefined()
    console.log('Track link:', url);

  }, 20000);
});
