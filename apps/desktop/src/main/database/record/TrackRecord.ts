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
  download_status?: 'none' | 'downloading' | 'downloaded' | 'failed';
  download_source_cid?: string;
  download_source_gateway?: string;
  download_error?: string;
  downloaded_at?: Date;
  freeflow_metadata_json?: string;
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
  download_status?: 'none' | 'downloading' | 'downloaded' | 'failed';
  download_source_cid?: string;
  download_source_gateway?: string;
  download_error?: string;
  downloaded_at?: Date;
  freeflow_metadata_json?: string;

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
    if (entity.freeflow !== undefined) {
      rec.freeflow_metadata_json = JSON.stringify(entity.freeflow);
    }
    return rec;
  }

  toEntity(): TrackEntity {
    let freeflow;
    if (this.freeflow_metadata_json) {
      try {
        freeflow = JSON.parse(this.freeflow_metadata_json);
      } catch {
        freeflow = undefined;
      }
    }

    return {
      album: this.album,
      artist: this.artist,
      cover_src: this.cover_src,
      created_at: this.created_at,
      duration: this.duration,
      id: this.id,
      downloaded: this.download_status === 'downloaded' || !!this.relative_local_path,
      download_status: this.download_status ?? (this.relative_local_path ? 'downloaded' : 'none'),
      download_source_cid: this.download_source_cid,
      download_source_gateway: this.download_source_gateway,
      download_error: this.download_error,
      downloaded_at: this.downloaded_at,
      modified_at: this.modified_at,
      platform: this.platform,
      platform_unique_id: this.platform_unique_id,
      played_count: this.played_count,
      title: this.title,
      freeflow,
    };
  }
}
