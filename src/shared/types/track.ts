import { Platform } from '@main/enum/Platform';

/**
 * TrackIdentifier 接口：用于唯一标识一首歌曲
 */
export interface TrackIdentifier {
  platform: Platform;
  platform_unique_id: string;
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