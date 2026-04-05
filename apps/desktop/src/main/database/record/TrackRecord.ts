import { AbstractRecord } from '@main/database/record/AbstractRecord';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Platform } from '@main/core/enum/Platform';

export interface TrackRecordProps {
  id: number;
  platform: Platform;
  platform_unique_id: string;
  title?: string;
  artist?: string;
  album: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  played_count?: number;
  relative_local_path?: string;
  created_at?: Date;
  modified_at?: Date;
}

export class TrackRecord extends AbstractRecord implements TrackRecordProps {
  id!: number;
  platform!: Platform;
  platform_unique_id!: string;
  title?: string;
  artist?: string;
  album!: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  played_count?: number;
  created_at?: Date;
  modified_at?: Date;
  relative_local_path: string;

  /**
   * 从 TrackEntity 创建 一个 TrackRecord 持久化对象,滤除id、创建时间、修改时间等
   * @param entity
   */
  static fromEntity(entity: TrackEntity): TrackRecord {
    const rec = new TrackRecord();
    rec.platform = entity.platform;
    rec.platform_unique_id = entity.platform_unique_id;
    rec.title = entity.title;
    rec.artist = entity.artist;
    rec.album = entity.album;
    rec.duration = entity.duration;
    rec.cover_src = entity.cover_src;
    return rec;
  }

  toEntity(): TrackEntity {
    return {
      album: this.album,
      artist: this.artist,
      cover_src: this.cover_src,
      created_at: this.created_at,
      duration: this.duration,
      id: this.id,
      downloaded: !!this.relative_local_path,
      modified_at: this.modified_at,
      platform: this.platform,
      platform_unique_id: this.platform_unique_id,
      played_count: this.played_count,
      title: this.title,
    };
  }
}