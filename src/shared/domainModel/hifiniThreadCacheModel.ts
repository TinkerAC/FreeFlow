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