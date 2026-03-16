import { describe, test, expect,  } from 'vitest';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { Platform } from '@main/core/enum/Platform';
import { testLogger } from '../logger';
import {BilibiliService} from "../../src/main/contentProvider/Bilibili/BilibiliService";


describe('Bilibili Provider', () => {
  let service: any;
  const provider: Bilibili =new Bilibili(new BilibiliService(),testLogger);

  test('platformName/serverNodes', () => {
    expect(provider.platformName).toBe(Platform.BILIBILI);
    expect(provider.serverNodes.length).toBeGreaterThan(0);
  });


  test("Search",async ()=>{
    const result = await provider.search("我的歌声里")
    console.dir(result)

  })

  test('searchTracks 命中 BV 返回全部分P track', async () => {
    const tracks = await provider.searchTrack('查看 BV1ABC1d7EfG 内容');
    expect(service.getVideoInfo).toHaveBeenCalledTimes(1);
    expect(tracks.length).toBe(2);
    expect(tracks[0].platform_unique_id).toBe('BV1ABC1d7EfG?p=1');
  });

  test('getTrackLink 解析出音频链接', async () => {
    const url = await provider.getTrackLink('BV1ABC1d7EfG?p=1');
    expect(service.getVideoInfo).toHaveBeenCalled();
    expect(service.getPlayUrl).toHaveBeenCalledWith('BV1ABC1d7EfG', 100);
    expect(url).toBe('https://audio.example/bv1.mp3');
  });

  test('search 未命中 BV 返回空结果', async () => {
    const fusion = await provider.search('普通关键词');
    expect(fusion.track_result.length).toBe(0);
    expect(fusion.playlist_result.length).toBe(0);
    expect(service.getVideoInfo).not.toHaveBeenCalled();
  });
});
