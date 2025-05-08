import { AbstractRecord } from '@main/database/record/AbstractRecord';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { Platform } from '@main/enum/Platform';

export interface PlaylistRecordProps {
  playlist_id: number;
  playlist_cover?: string;
  title: string;
  description?: string;
  creator: string;
  platform: Platform;
  platform_unique_id: string;
  played_count: number;
  created_at?: Date;
  modified_at?: Date;
}

export class PlaylistRecord extends AbstractRecord implements PlaylistRecordProps {
  playlist_id!: number;
  playlist_cover?: string;
  title!: string;
  description?: string;
  creator!: string;
  platform!: Platform;
  platform_unique_id!: string;
  played_count!: number;
  created_at?: Date;
  modified_at?: Date;


  toEntity(): PlaylistEntity {
    return {
      is_persistent: false, tracks: [],
      playlist_id: this.playlist_id,
      playlist_cover: this.playlist_cover,
      title: this.title,
      description: this.description,
      creator: this.creator,
      platform: this.platform,
      platform_unique_id: this.platform_unique_id,
      played_count: this.played_count,
      created_at: this.created_at,
      modified_at: this.modified_at,
    };
  }


  static fromEntity(entity: PlaylistEntity): PlaylistRecord {
    const rec = new PlaylistRecord();
    // 依次映射所有 DTO 字段
    rec.playlist_id = entity.playlist_id;
    rec.playlist_cover = entity.playlist_cover;
    rec.title = entity.title;
    rec.description = entity.description;
    rec.creator = entity.creator;
    rec.platform = entity.platform;
    rec.platform_unique_id = entity.platform_unique_id;
    rec.played_count = entity.played_count;
    rec.created_at = entity.created_at;
    rec.modified_at = entity.modified_at;

    return rec;
  }


}