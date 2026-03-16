import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';
import { Platform } from '@main/core/enum/Platform';
import { Logger } from 'winston';

/**
 * ContentProvider 接口定义了统一的搜索和获取播放链接方法，
 * 各个平台的服务类需要实现该接口，从而达到接口统一、逻辑覆盖的目的。
 */
export abstract class AbstractContentProvider {


  /**
   * 平台名称
   * @example 'QQMusic'
   */
  abstract platformName: Platform;
  /**
   *  所有可用的服务器节点
   */
  abstract serverNodes: string[];
  /**
   *  日志记录器
   */
  protected abstract readonly logger: Logger;

  /**
   * 是否为受审查平台（如中国大陆平台）
   * 默认为 false，子类可覆盖
   */
  isCensored: boolean = false;

  /**
   * 根据关键词搜索歌曲，返回统一的 TrackRecord 数组
   * @param keyword 搜索关键词
   * @param filterPaid 是否过滤付费歌曲
   */
  abstract searchTrack(keyword: string, filterPaid: boolean): Promise<TrackEntity[]>;

  /**
   * 根据平台内部的唯一标识获取歌曲播放链接
   * @param uniqueId 平台内部标识（例如：QQ 的 songmid、网易云的歌曲 ID、Hifini 的 dataHref）
   */
  abstract getTrackLink(uniqueId: string): Promise<string | void>;


  abstract getLyrics(uniqueId: string): Promise<Lyric>;

  /**
   * 根据平台内部的唯一标识判断歌曲是否免费可听
   */
  abstract isFree(song: any): boolean;


}
