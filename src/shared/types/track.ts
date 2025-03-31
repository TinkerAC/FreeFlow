import { Platform } from '@/enum/Platform';

/**
 * TrackIdentifier 接口：用于唯一标识一首歌曲
 */
export interface TrackIdentifier {
  platform: Platform;
  platform_unique_id: string;
}

/**
 * LyricLine 接口：表示歌词中的一行，包含时间（毫秒）和文本
 */
export interface LyricLine {
  time: number;    // 时间，单位毫秒
  text: string;    // 歌词文本
}

/**
 * Lyric 接口：表示完整歌词，包含多行歌词
 */
export interface Lyric {
  lines: LyricLine[];
}

/**
 * HifiniThreadCacheModel 接口：用于缓存 Hifini 相关数据
 */
export interface HifiniThreadCacheModel {
  data_href: string;
  title: string;
  artist: string;
  cover_src: string;
  un_redirected_url: string;
  cached_at: Date;
  modified_at: Date;
}