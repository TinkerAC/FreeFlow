import { describe, test, expect, beforeEach, vi } from 'vitest';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';
import { Platform } from '@main/core/enum/Platform';
import type { BilibiliService, BiliVideoInfo, PlayUrl } from '@main/contentProvider/Bilibili/BilibiliService';
import { testLogger } from '../logger';

// Mocking BilibiliService using vitest
const createMockService = () => {
  return {
    getVideoInfo: vi.fn(),
    getPlayUrl: vi.fn(),
  } as unknown as any;
};

describe('Bilibili Provider', () => {
  let service: any;
  let provider: Bilibili;

  beforeEach(() => {
    service = createMockService();
    const video: BiliVideoInfo = {
      bvid: 'BV1ABC1d7EfG',
      title: '测试视频',
      cover: 'https://i.example/cover.jpg',
      owner: { name: 'UP主', mid: 1 },
      pages: [
        { bvid: 'BV1ABC1d7EfG', cid: 100, part: 'P1', duration: 65 },
        { bvid: 'BV1ABC1d7EfG', cid: 101, part: 'P2', duration: 70 },
      ],
    };
    const play: PlayUrl = {
      audioUrl: 'https://audio.example/bv1.mp3',
      mime: 'audio/mp4',
      qualityId: 30216,
      expireAt: Date.now() + 3600_000,
    };
    service.getVideoInfo.mockResolvedValue(video);
    service.getPlayUrl.mockResolvedValue(play);
    provider = new Bilibili(service as any, testLogger);
  });

  test('platformName/serverNodes', () => {
    expect(provider.platformName).toBe(Platform.BILIBILI);
    expect(provider.serverNodes.length).toBeGreaterThan(0);
  });

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
