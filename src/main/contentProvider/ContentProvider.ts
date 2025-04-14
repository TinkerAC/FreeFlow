import { Lyric, TrackModel } from '@src/shared/types';
import ping from 'ping';

/**
 * ContentProvider 接口定义了统一的搜索和获取播放链接方法，
 * 各个平台的服务类需要实现该接口，从而达到接口统一、逻辑覆盖的目的。
 */
export abstract class ContentProvider {


  /**
   * 平台名称
   * @example 'QQMusic'
   */
  abstract platformName: string;

  /**
   *  所有可用的服务器节点
   */
  abstract serverNodes: string[];

  /**
   * 根据关键词搜索歌曲，返回统一的 TrackModel 数组
   * @param keyword 搜索关键词
   */
  abstract searchTracks(keyword: string): Promise<TrackModel[]>;

  /**
   * 根据平台内部的唯一标识获取歌曲播放链接
   * @param uniqueId 平台内部标识（例如：QQ 的 songmid、网易云的歌曲 ID、Hifini 的 dataHref）
   */
  abstract getTrackLink(uniqueId: string): Promise<string | void>;


  abstract getLyrics(uniqueId: string): Promise<Lyric | void>;

  /**
   * 根据平台内部的唯一标识判断歌曲是否免费可听
   */
  abstract isFree(song: any): boolean;


}
