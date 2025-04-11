/**
 * models.ts
 *
 * 本文件包含音乐平台中各类模型的定义：
 * - 歌曲模型（TrackModel 及其各平台子类：NetEaseCloudMusicTrackModel、LocalPlayTrackModel、HifiniTrackModel）
 * - 歌单模型（PlaylistModel）
 * - 播放器状态（PlayerState）
 * - 其他相关接口和枚举定义
 * - ModelFactory：统一管理并创建模型实例的工厂方法
 */

import { Platform } from '@main/enum/Platform';

/* --------------------- 接口定义 --------------------- */

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
  time: number;
  text: string;
}

/**
 * Lyric 接口：表示完整歌词，包含多行歌词
 */
export interface Lyric {
  lines: LyricLine[];
}

/* --------------------- 抽象类及具体类定义 --------------------- */

/**
 * TrackModel 抽象类，代表音乐平台中的一首歌曲
 */
export abstract class TrackModel {
  id: number;                   // 数据库主键
  platform: Platform;           // 所属平台
  platform_unique_id: string;   // 平台内唯一标识
  title: string;                // 歌曲标题
  artist: string;               // 歌手
  album: string;                // 专辑名称
  duration: number;             // 歌曲时长（单位：秒或毫秒，根据项目约定）
  cover_src: string;            // 封面图片地址
  created_at: Date;             // 创建时间

  /**
   * 获取歌曲的唯一标识信息
   */
  getIdentifier(): TrackIdentifier {
    return {
      platform: this.platform,
      platform_unique_id: this.platform_unique_id,
    };
  }

  // 如果需要，可在子类中实现 buildFromResponse(json: any): TrackModel 方法用于从 JSON 构造实例
}

/**
 * NetEaseCloudMusicTrackModel 类：网易云音乐平台的 TrackModel 实现
 */
export class NetEaseCloudMusicTrackModel extends TrackModel {
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
  public static build(json:any): TrackModel {
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
  static empty(): TrackModel {
    return new NetEaseCloudMusicTrackModel(0, '', '', '', new Date(), 0, '', '', '');
  }

  /**
   * 私有方法，判断当前歌曲是否免费
   */
  private isFree(): boolean {
    return this.fee === 0 || this.fee === 8;
  }
}


/**
 * QQMusicTrackModel 类：QQ音乐平台的 TrackModel 实现
 */
export class QQMusicTrackModel extends TrackModel {
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
  public static buildFromResponse(json: any): TrackModel {
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
    const platform_unique_id = json.songmid ;

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

  public static build(json: any): TrackModel {
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
  static empty(): TrackModel {
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
 * LocalPlayTrackModel 类：本地音乐的 TrackModel 实现
 */
export class LocalPlayTrackModel extends TrackModel {
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
  public static build(json: any): TrackModel {
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
  static empty(): TrackModel {
    return new LocalPlayTrackModel('', '', '', new Date(), 0, '', '', '');
  }
}

/**
 * HifiniTrackModel 类：Hifini 平台的 TrackModel 实现
 */
export class HifiniTrackModel extends TrackModel {
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
  public static build(json: any): TrackModel {
    return new HifiniTrackModel(
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
  static empty(): TrackModel {
    return new HifiniTrackModel(0, '', '', '', new Date(), 0, '', '', '');
  }
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

/* --------------------- 播放器状态、搜索结果及音乐库定义 --------------------- */

/**
 * PlayerState 类：表示播放器的当前状态
 */
export class PlayerState {
  queue: TrackModel[];
  volume: number;
  indexList: number[];
  currentIndex: number;
  playbackMode: 'loop' | 'shuffle' | 'repeat';
  audioSrc: string;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  currentTrackInfo: TrackModel | null;
  nextTracks: TrackModel[];

  /**
   * 返回一个空的播放器状态
   */
  static empty(): PlayerState {
    return {
      queue: [],
      volume: 1,
      indexList: [],
      currentIndex: 0,
      playbackMode: 'loop',
      audioSrc: '',
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      currentTrackInfo: null,
      nextTracks: [],
    };
  }
}

/**
 * FusionSearchResult 接口：表示搜索结果，包含歌曲和歌单
 */
export interface FusionSearchResult {
  tracks: TrackModel[];
  playlists: PlaylistModel[];
}

/**
 * MusicLibraryItemType 枚举：表示音乐库中项目的类型
 */
export enum MusicLibraryItemType {
  PLAYLIST = 'Playlist',
  ALBUM = 'Album',
  LIBRARY = 'Library',
}

/**
 * BaseMusicLibraryItem 接口：音乐库中基础项
 */
export interface BaseMusicLibraryItem {
  title: string;
  type: MusicLibraryItemType;
  cover_src: string;
}

/**
 * MusicLibraryItem 接口：具有子项的音乐库项
 */
export interface MusicLibraryItem extends BaseMusicLibraryItem {
  items: MusicLibraryItem[];
}

/**
 * PlaylistItem 接口：表示歌单项
 */
export interface PlaylistItem extends BaseMusicLibraryItem {
  platform: Platform;
  platform_unique_id: string;
  persistent_id: string;
}

/**
 * PlaylistModel 类：表示一个歌单，包含多个 TrackModel 实例
 */
export class PlaylistModel {
  playlist_id: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  is_persistent?: boolean = false;
  description: string;
  created_at: Date;
  tracks: TrackModel[];
  creator: string;
  modified_at: Date;
  cover_src: string;

  constructor(
    playlist_id: number,
    platform: Platform,
    platform_unique_id: string,
    title: string,
    is_persistent: boolean,
    description: string,
    created_at: Date,
    tracks: TrackModel[],
    creator: string,
    modified_at: Date,
    cover_src: string,
  ) {
    this.playlist_id = playlist_id;
    this.platform = platform;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
    this.is_persistent = is_persistent;
    this.description = description;
    this.created_at = new Date(created_at);
    this.tracks = tracks;
    this.creator = creator;
    this.modified_at = new Date(modified_at);
    this.cover_src = cover_src;
  }

  /**
   * 根据 JSON 数据构建 PlaylistModel 实例
   * 注意：tracks 字段需要在业务层调用 ModelFactory.buildTrackModel 进行转换
   * @param json JSON 数据
   */
  public static build(json: any): PlaylistModel {
    return new PlaylistModel(
      json.playlist_id,
      json.platform,
      json.platform_unique_id,
      json.title,
      json.is_persistent,
      json.description,
      json.created_at,
      json.tracks, // 这里 tracks 数组需要进一步处理转换成 TrackModel 实例
      json.creator,
      json.modified_at,
      json.cover_src,
    );
  }
}

/* --------------------- 统一工厂类 --------------------- */

/**
 * ModelFactory 类：统一管理并创建 TrackModel 与 PlaylistModel 的实例，
 * 根据 JSON 数据中的平台信息自动判断创建对应的子类实例
 */
export class ModelFactory {
  /**
   * 根据 JSON 数据构建 TrackModel 子类实例
   * @param json JSON 数据，必须包含 platformContext 字段
   */
  public static buildTrackModel(json: any): TrackModel {
    if (!json || !json.platform) {
      throw new Error('无效的 JSON 数据：缺少平台信息');
    }
    switch (json.platform) {
      case Platform.NET_EASE_CLOUD_MUSIC:
        return NetEaseCloudMusicTrackModel.build(json);
      case Platform.LOCAL:
        return LocalPlayTrackModel.build(json);
      case Platform.HIFINI:
        return HifiniTrackModel.build(json);
      case Platform.QQ_MUSIC:
        return QQMusicTrackModel.build(json);
      default:
        throw new Error('未知的平台：' + json.platform);
    }
  }

  /**
   * 根据 JSON 数据构建 PlaylistModel 实例
   * @param json JSON 数据
   */
  public static buildPlaylistModel(json: any): PlaylistModel {
    return PlaylistModel.build(json);
  }
}

/* --------------------- 其他辅助定义 --------------------- */

// 此处可以添加其他辅助函数或常量定义，例如数据转换、格式化工具等