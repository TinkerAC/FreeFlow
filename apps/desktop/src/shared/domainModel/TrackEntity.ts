import { Platform } from '@main/core/enum/Platform';
import { AbstractEntity } from '@src/shared/domainModel/AbstractEntity';

export interface FreeFlowTrackInfo {
  resourceKey: string;
  chainId: number | null;
  contractAddress: string | null;
  tokenId: string | null;
  accessModel: string | null;
  previewSeconds: number | null;
  priceEth: string | null;
  royaltyBps: number | null;
  coverUrl: string | null;
  audioUrl: string | null;
  metadataUrl: string | null;
  metadataCid: string | null;
  explorerUrl: string | null;
  platformHubAddress: string | null;
  publishTxHash: string | null;
  releaseId: string | null;
  status: string | null;
  metadataDocument: unknown | null;
}


/**
 * TrackRecord 抽象类，代表音乐平台中的一首歌曲
 */
export abstract class TrackEntity extends AbstractEntity {
  id?: number;                   // 数据库主键,在业务逻辑中是可选的
  platform!: Platform;           // 所属平台
  platform_unique_id!: string;   // 平台内唯一标识
  title?: string;                // 歌曲标题
  artist?: string;               // 歌手
  album?: string;                // 专辑名称
  duration?: number;             // 歌曲时长（单位：秒或毫秒，根据项目约定）
  cover_src?: string;            // 封面图片地址
  created_at?: Date;             // 创建时间
  downloaded?: boolean;           // 是否已下载
  modified_at?: Date;           // 修改时间
  played_count?: number;         // 播放次数
  freeflow?: FreeFlowTrackInfo;  // FreeFlow 资源的链上/索引信息


  // abstract isFree(): boolean; // 抽象方法，判断歌曲是否免费

}

/**
 * TrackIdentifier 接口：用于唯一标识一首歌曲
 */
export interface TrackIdentifier {
  platform: Platform;
  platform_unique_id: string;
}

/**
 * LocalPlayTrackModel 类：本地音乐的 TrackRecord 实现
 */
export class LocalPlayTrackModel extends TrackEntity {
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;

  constructor(
    album: string,
    artist: string,
    cover_src: string,
    created_at: Date,
    duration: number,
    platform: string,
    platform_unique_id: string,
    title: string,
  ) {
    super();
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = new Date(created_at);
    this.duration = duration;
    this.platform = Platform.LOCAL;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  /**
   * 根据 JSON 数据构建本地歌曲实例
   * @param json JSON 数据
   */
  public static build(json: any): TrackEntity {
    return new LocalPlayTrackModel(
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }

  /**
   * 返回一个空实例
   */
  static empty(): TrackEntity {
    return new LocalPlayTrackModel('', '', '', new Date(), 0, '', '', '');
  }
}

/**
 * HifiniTrackEntity 类：Hifini 平台的 TrackRecord 实现
 */
export class HifiniTrackEntity extends TrackEntity {
  id: number;
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;

  constructor(
    id: number,
    album: string,
    artist: string,
    cover_src: string,
    created_at: Date,
    duration: number,
    platform: string,
    platform_unique_id: string,
    title: string,
  ) {
    super();
    this.id = id;
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = new Date(created_at);
    this.duration = duration;
    this.platform = Platform.HIFINI;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  /**
   * 根据 JSON 数据构建 Hifini 平台歌曲实例
   * @param json JSON 数据
   */
  public static build(json: any): TrackEntity {
    return new HifiniTrackEntity(
      json.id,
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }

  /**
   * 返回一个空实例
   */
  static empty(): TrackEntity {
    return new HifiniTrackEntity(0, '', '', '', new Date(), 0, '', '', '');
  }
}

/**
 * QQMusicTrackModel 类：QQ音乐平台的 TrackRecord 实现
 */
export class QQMusicTrackModel extends TrackEntity {
  id: number;
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  fee: number; // 付费信息

  constructor(
    id: number,
    album: string,
    artist: string,
    cover_src: string,
    created_at: Date,
    duration: number,
    platform: string,
    platform_unique_id: string,
    title: string,
    fee: number,
  ) {
    super();
    this.id = id;
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = new Date(created_at);
    this.duration = duration;
    this.platform = Platform.QQ_MUSIC;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
    this.fee = fee;
  }

  /**
   * 根据 JSON 数据构建 QQ 音乐歌曲实例
   * @param json JSON 数据，字段参考 QQ 音乐接口返回
   */
  public static buildFromResponse(json: any): TrackEntity {
    // 判断收费规则，这里示例为：pay.play === 1 表示免费，否则视为收费
    const fee = (json.pay && json.pay.payplay === 1) ? 0 : 1;
    // 提取各字段，注意做合理的空值处理

    const album = json.albumname || '';
    const title = json.songname || '';
    // 处理 singer 数组，假设每个元素都有 name 属性
    const artist = (json.singer && Array.isArray(json.singer))
      ? json.singer.map((s: any) => s.name || '').join('/')
      : '';
    const cover_src = json.albummid
      ? `https://y.gtimg.cn/music/photo_new/T002R300x300M000${json.albummid}.jpg?max_age=2592000`
      : '';
    // pubtime 是秒级时间戳，转换为毫秒
    const created_at = json.pubtime ? new Date(json.pubtime * 1000) : new Date();
    const duration = json.interval || 0;
    const platform_unique_id = json.songmid;

    return new QQMusicTrackModel(
      0,
      album,
      artist,
      cover_src,
      created_at,
      duration,
      'QQMusic',
      platform_unique_id,
      title,
      fee,
    );
  }

  public static build(json: any): TrackEntity {
    return new QQMusicTrackModel(
      json.id,
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
      json.fee,
    );
  }


  /**
   * 返回一个空实例
   */
  static empty(): TrackEntity {
    return new QQMusicTrackModel(0, '', '', '', new Date(), 0, '', '', '', 0);
  }

  /**
   * 私有方法，判断当前歌曲是否免费
   */
  private isFree(): boolean {
    return this.fee === 0;
  }
}

/**
 * YouTubeMusicTrackModel 类：YouTube Music 平台的 TrackRecord 实现
 */
export class YouTubeMusicTrackModel extends TrackEntity {
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;

  constructor(
    platform_unique_id: string,
    title: string,
    artist: string,
    album: string,
    duration: number,
    cover_src: string,
  ) {
    super();
    this.platform = Platform.YOUTUBE_MUSIC;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
    this.artist = artist;
    this.album = album;
    this.duration = duration;
    this.cover_src = cover_src;
    this.created_at = new Date();
  }

  public static build(json: {
    platform_unique_id: string;
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    cover_src?: string;
  }): TrackEntity {
    return new YouTubeMusicTrackModel(
      json.platform_unique_id,
      json.title ?? '',
      json.artist ?? '',
      json.album ?? '',
      json.duration ?? 0,
      json.cover_src ?? '',
    );
  }

  static empty(): TrackEntity {
    return new YouTubeMusicTrackModel('', '', '', '', 0, '');
  }
}


/**
 * NetEaseCloudMusicTrackModel 类：网易云音乐平台的 TrackRecord 实现
 */
export class NetEaseCloudMusicTrackModel extends TrackEntity {
  id: number;
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  fee: number;  // 付费信息

  constructor(
    id: number,
    album: string,
    artist: string,
    cover_src: string,
    created_at: Date,
    duration: number,
    platform: string,
    platform_unique_id: string,
    title: string,
  ) {
    super();
    this.id = id;
    this.album = album;
    this.artist = artist;
    this.cover_src = cover_src;
    this.created_at = new Date(created_at);
    this.duration = duration;
    this.platform = Platform.NET_EASE_CLOUD_MUSIC;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
  }

  /**
   * 根据 JSON 数据构建网易云音乐歌曲实例
   * @param json JSON 数据
   */
  public static build(json: any): TrackEntity {
    return new NetEaseCloudMusicTrackModel(
      json.id,
      json.album,
      json.artist,
      json.cover_src,
      json.created_at,
      json.duration,
      json.platform,
      json.platform_unique_id,
      json.title,
    );
  }

  /**
   * 返回一个空实例
   */
  static empty(): TrackEntity {
    return new NetEaseCloudMusicTrackModel(0, '', '', '', new Date(), 0, '', '', '');
  }

  /**
   * 私有方法，判断当前歌曲是否免费
   */
  private isFree(): boolean {
    return this.fee === 0 || this.fee === 8;
  }
}

export class FreeFlowTrackModel extends TrackEntity {
  album: string;
  artist: string;
  cover_src: string;
  created_at: Date;
  duration: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  freeflow: FreeFlowTrackInfo;

  constructor(input: {
    platform_unique_id: string;
    title: string;
    artist: string;
    album: string;
    duration: number;
    cover_src: string;
    freeflow: FreeFlowTrackInfo;
  }) {
    super();
    this.platform = Platform.FREEFLOW;
    this.platform_unique_id = input.platform_unique_id;
    this.title = input.title;
    this.artist = input.artist;
    this.album = input.album;
    this.duration = input.duration;
    this.cover_src = input.cover_src;
    this.created_at = new Date();
    this.freeflow = input.freeflow;
  }

  public static build(json: {
    platform_unique_id: string;
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    cover_src?: string;
    freeflow: FreeFlowTrackInfo;
  }): TrackEntity {
    return new FreeFlowTrackModel({
      platform_unique_id: json.platform_unique_id,
      title: json.title ?? '',
      artist: json.artist ?? '',
      album: json.album ?? '',
      duration: json.duration ?? 0,
      cover_src: json.cover_src ?? '',
      freeflow: json.freeflow,
    });
  }
}
