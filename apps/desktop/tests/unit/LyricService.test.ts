import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { LyricService } from '../../src/main/services/LyricService';
import { testLogger } from '../logger';
import { Platform } from '@main/core/enum/Platform';
import NetEaseCloudMusic from '../../src/main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '../../src/main/contentProvider/QQMusic/QQMusic';
import YouTubeMusic from '../../src/main/contentProvider/YouTubeMusic/YouTubeMusic';
import { ProviderManager } from '../../src/main/core/ProviderManager';
import { Lyric, LyricLine } from '../../src/shared/domainModel/lyricLine';
import { TrackEntity } from '../../src/shared/domainModel/TrackEntity';

describe('LyricService', () => {
  let lyricService: LyricService;
  let mockNetEaseMusic: any;
  let mockQQMusic: any;
  let mockYouTubeMusic: any;
  let mockProviderManager: any;

  // 创建有效的测试歌词
  const createValidLyric = (): Lyric => {
    const lines: LyricLine[] = [
      { time: 0, text: '钟声响起归家的讯号' },
      { time: 3000, text: '在他生命里' },
      { time: 6000, text: '彷佛带点唏嘘' },
    ];
    return new Lyric(lines, [], []);
  };

  // 创建空歌词
  const createEmptyLyric = (): Lyric => {
    return new Lyric([], [], []);
  };

  beforeEach(() => {
    // Mock providers
    mockNetEaseMusic = {
      getLyrics: vi.fn(),
      searchTrack: vi.fn(),
      platformName: Platform.NET_EASE_CLOUD_MUSIC,
    } as any;

    mockQQMusic = {
      getLyrics: vi.fn(),
      searchTrack: vi.fn(),
      platformName: Platform.QQ_MUSIC,
    } as any;

    mockYouTubeMusic = {
      getLyrics: vi.fn(),
      searchTrack: vi.fn(),
      platformName: Platform.YOUTUBE_MUSIC,
    } as any;

    // Mock ProviderManager
    mockProviderManager = {
      tryResolve: vi.fn(),
      getEnabledProviders: vi.fn(),
    } as any;

    // 创建 LyricService 实例
    lyricService = new LyricService(
      mockNetEaseMusic,
      mockQQMusic,
      mockYouTubeMusic,
      mockProviderManager,
      testLogger,
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getLyrics - 首选平台成功', () => {
    test('应该从首选平台 (QQMusic) 成功获取歌词', async () => {
      const track: TrackEntity = {
        platform: Platform.QQ_MUSIC,
        platform_unique_id: '001abc123',
        title: '光辉岁月',
        artist: 'Beyond',
      } as TrackEntity;

      const validLyric = createValidLyric();
      mockProviderManager.tryResolve.mockReturnValue(mockQQMusic);
      mockQQMusic.getLyrics.mockResolvedValue(validLyric);

      const result = await lyricService.getLyrics(track);

      expect(mockProviderManager.tryResolve).toHaveBeenCalledWith(Platform.QQ_MUSIC);
      expect(mockQQMusic.getLyrics).toHaveBeenCalledWith('001abc123');
      expect(result!.isValid()).toBeTruthy();
      expect(result!.originLines).toHaveLength(3);
    });

    test('应该从首选平台 (NetEaseCloudMusic) 成功获取歌词', async () => {
      const track: TrackEntity = {
        platform: Platform.NET_EASE_CLOUD_MUSIC,
        platform_unique_id: '12345678',
        title: '海阔天空',
        artist: 'Beyond',
      } as TrackEntity;

      const validLyric = createValidLyric();
      mockProviderManager.tryResolve.mockReturnValue(mockNetEaseMusic);
      mockNetEaseMusic.getLyrics.mockResolvedValue(validLyric);

      const result = await lyricService.getLyrics(track);

      expect(mockProviderManager.tryResolve).toHaveBeenCalledWith(Platform.NET_EASE_CLOUD_MUSIC);
      expect(mockNetEaseMusic.getLyrics).toHaveBeenCalledWith('12345678');
      expect(result!.isValid()).toBeTruthy();
    });
  });

  describe('getLyrics - 首选平台失败，启动兜底搜索', () => {
    test('当首选平台返回空歌词时，应该触发兜底搜索', async () => {
      const track: TrackEntity = {
        platform: Platform.QQ_MUSIC,
        platform_unique_id: '001xyz',
        title: '光辉岁月',
        artist: 'Beyond',
      } as TrackEntity;

      const emptyLyric = createEmptyLyric();
      const validLyric = createValidLyric();

      // 首选平台返回空歌词
      mockProviderManager.tryResolve.mockReturnValue(mockQQMusic);
      mockQQMusic.getLyrics.mockResolvedValue(emptyLyric);

      // 兜底搜索
      mockProviderManager.getEnabledProviders.mockReturnValue([mockNetEaseMusic]);
      mockNetEaseMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: 'netease123',
          title: '光辉岁月',
          artist: 'Beyond',
        } as TrackEntity,
      ]);
      mockNetEaseMusic.getLyrics.mockResolvedValue(validLyric);

      const result = await lyricService.getLyrics(track);

      expect(mockQQMusic.getLyrics).toHaveBeenCalledWith('001xyz');
      expect(mockNetEaseMusic.searchTrack).toHaveBeenCalledWith('光辉岁月 Beyond', false);
      expect(mockNetEaseMusic.getLyrics).toHaveBeenCalledWith('netease123');
      expect(result!.isValid()).toBeTruthy();
    });

    test('当首选平台抛出错误时，应该触发兜底搜索', async () => {
      const track: TrackEntity = {
        platform: Platform.QQ_MUSIC,
        platform_unique_id: '001error',
        title: '真的爱你',
        artist: 'Beyond',
      } as TrackEntity;

      const validLyric = createValidLyric();

      // 首选平台抛出错误
      mockProviderManager.tryResolve.mockReturnValue(mockQQMusic);
      mockQQMusic.getLyrics.mockRejectedValue(new Error('Network error'));

      // 兜底搜索
      mockProviderManager.getEnabledProviders.mockReturnValue([mockNetEaseMusic]);
      mockNetEaseMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: 'netease456',
          title: '真的爱你',
          artist: 'Beyond',
        } as TrackEntity,
      ]);
      mockNetEaseMusic.getLyrics.mockResolvedValue(validLyric);

      const result = await lyricService.getLyrics(track);

      expect(mockNetEaseMusic.searchTrack).toHaveBeenCalled();
      expect(mockNetEaseMusic.getLyrics).toHaveBeenCalledWith('netease456');
      expect(result!.isValid()).toBeTruthy();
    });
  });

  describe('getLyrics - Round-Robin 兜底逻辑', () => {
    test('应该按照 Round-Robin 轮询多个平台的搜索结果', async () => {
      const track: TrackEntity = {
        platform: Platform.HIFINI,
        platform_unique_id: 'hifini_123',
        title: '光辉岁月',
        artist: 'Beyond',
      } as TrackEntity;

      const emptyLyric = createEmptyLyric();
      const validLyric = createValidLyric();

      // 首选平台不支持获取歌词
      mockProviderManager.tryResolve.mockReturnValue(null);

      // 兜底搜索：两个平台
      mockProviderManager.getEnabledProviders.mockReturnValue([
        mockNetEaseMusic,
        mockQQMusic,
      ]);

      // NetEaseMusic 搜索结果
      mockNetEaseMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: 'netease_1',
          title: '光辉岁月',
          artist: 'Beyond',
        } as TrackEntity,
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: 'netease_2',
          title: '光辉岁月 (Live)',
          artist: 'Beyond',
        } as TrackEntity,
      ]);

      // QQMusic 搜索结果
      mockQQMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.QQ_MUSIC,
          platform_unique_id: 'qq_1',
          title: '光辉岁月',
          artist: 'Beyond',
        } as TrackEntity,
      ]);

      // 第一轮：netease_1 失败，qq_1 成功
      mockNetEaseMusic.getLyrics.mockResolvedValueOnce(emptyLyric);
      mockQQMusic.getLyrics.mockResolvedValueOnce(validLyric);

      const result = await lyricService.getLyrics(track);

      // 验证调用顺序：第一轮尝试 netease_1 和 qq_1
      expect(mockNetEaseMusic.getLyrics).toHaveBeenCalledWith('netease_1');
      expect(mockQQMusic.getLyrics).toHaveBeenCalledWith('qq_1');
      expect(result!.isValid()).toBeTruthy();
    });

    test('应该在所有候选歌曲都失败后返回 undefined', async () => {
      const track: TrackEntity = {
        platform: Platform.HIFINI,
        platform_unique_id: 'hifini_456',
        title: '不存在的歌',
        artist: '不存在的歌手',
      } as TrackEntity;

      const emptyLyric = createEmptyLyric();

      mockProviderManager.tryResolve.mockReturnValue(null);
      mockProviderManager.getEnabledProviders.mockReturnValue([mockNetEaseMusic, mockQQMusic]);

      mockNetEaseMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: 'netease_fail',
          title: '不存在的歌',
          artist: '不存在的歌手',
        } as TrackEntity,
      ]);

      mockQQMusic.searchTrack.mockResolvedValue([
        {
          platform: Platform.QQ_MUSIC,
          platform_unique_id: 'qq_fail',
          title: '不存在的歌',
          artist: '不存在的歌手',
        } as TrackEntity,
      ]);

      // 所有平台都返回空歌词
      mockNetEaseMusic.getLyrics.mockResolvedValue(emptyLyric);
      mockQQMusic.getLyrics.mockResolvedValue(emptyLyric);

      const result = await lyricService.getLyrics(track);

      expect(result).toBeUndefined();
    });
  });

  describe('getLyrics - 边界情况和错误处理', () => {
    test('当 track 缺少 platform_unique_id 时应该抛出错误', async () => {
      const track: TrackEntity = {
        platform: Platform.QQ_MUSIC,
        title: '测试歌曲',
      } as TrackEntity;

      await expect(lyricService.getLyrics(track)).rejects.toThrow('无效的歌曲标识符: 缺少 platform_unique_id 字段');
    });

    test('当所有平台的搜索都失败时应该返回 undefined', async () => {
      const track: TrackEntity = {
        platform: Platform.HIFINI,
        platform_unique_id: 'hifini_error',
        title: '测试歌曲',
        artist: '测试歌手',
      } as TrackEntity;

      mockProviderManager.tryResolve.mockReturnValue(null);
      mockProviderManager.getEnabledProviders.mockReturnValue([mockNetEaseMusic, mockQQMusic]);

      // 所有搜索都失败
      mockNetEaseMusic.searchTrack.mockRejectedValue(new Error('Search failed'));
      mockQQMusic.searchTrack.mockRejectedValue(new Error('Search failed'));

      const result = await lyricService.getLyrics(track);

      expect(result).toBeUndefined();
    });
  });
});
