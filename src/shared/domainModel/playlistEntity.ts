import { Platform } from '@main/core/enum/Platform';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { AbstractEntity } from '@src/shared/domainModel/AbstractEntity';

/**
 * PlaylistRecord 类：表示一个歌单，包含多个 TrackRecord 实例
 */
export class PlaylistEntity extends AbstractEntity {
  playlist_id?: number;
  platform: Platform;
  platform_unique_id: string;
  title: string;
  is_persistent?: boolean = false;
  description: string;
  created_at: Date;
  tracks: TrackEntity[];
  creator: string;
  modified_at: Date;
  playlist_cover: string;
  played_count?: number;

  constructor(
    playlist_id: number,
    platform: Platform,
    platform_unique_id: string,
    title: string,
    is_persistent: boolean,
    description: string,
    created_at: Date,
    tracks: TrackEntity[],
    creator: string,
    modified_at: Date,
    playlist_cover: string,
  ) {
    super();
    this.playlist_id = playlist_id;
    this.platform = platform;
    this.platform_unique_id = platform_unique_id;
    this.title = title;
    this.is_persistent = is_persistent;
    this.description = description;
    this.playlist_cover = playlist_cover;
    this.created_at = new Date(created_at);
    this.tracks = tracks;
    this.creator = creator;
    this.modified_at = new Date(modified_at);
  }

  /**
   * 根据 JSON 数据构建 PlaylistRecord 实例
   * 注意：tracks 字段需要在业务层调用 ModelFactory.buildTrackModel 进行转换
   * @param json JSON 数据
   */
  public static build(json: any): PlaylistEntity {
    return new PlaylistEntity(
      json.playlist_id,
      json.platform,
      json.platform_unique_id,
      json.title,
      json.is_persistent,
      json.description,
      json.created_at,
      json.tracks, // 这里 tracks 数组需要进一步处理转换成 TrackRecord 实例
      json.creator,
      json.modified_at,
      json.playlist_cover,
    );
  }
}