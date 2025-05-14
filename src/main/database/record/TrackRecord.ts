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

  static fromEntity(entity: TrackEntity): TrackRecord {
    const rec = new TrackRecord();
    // 依次映射所有 DTO 字段
    rec.id = entity.id!;
    rec.platform = entity.platform;
    rec.platform_unique_id = entity.platform_unique_id;
    rec.title = entity.title;
    rec.artist = entity.artist;
    rec.album = entity.album;
    rec.duration = entity.duration;
    rec.cover_src = entity.cover_src;
    rec.played_count = entity.played_count;
    rec.created_at = entity.created_at;
    rec.modified_at = entity.modified_at;
    return rec;
  }
}