import { AbstractRecord } from '@main/database/record/AbstractRecord';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';

export interface HifiniThreadCacheRecordProps {
  data_href: string;
  title?: string;
  artist?: string;
  cover_src?: string;
  un_redirected_url?: string;
  cached_at?: Date;
  modified_at?: Date;
}


export class HifiniThreadCacheRecord extends AbstractRecord implements HifiniThreadCacheRecordProps {
  data_href!: string;
  title?: string;
  artist?: string;
  cover_src?: string;
  un_redirected_url?: string;
  cached_at?: Date;
  modified_at?: Date;

  static fromEntity(entity: HifiniThreadCacheModel): HifiniThreadCacheRecord {
    const rec = new HifiniThreadCacheRecord();
    // 依次映射所有 DTO 字段
    rec.data_href = entity.data_href;
    rec.title = entity.title;
    rec.artist = entity.artist;
    rec.cover_src = entity.cover_src;
    rec.un_redirected_url = entity.un_redirected_url;
    rec.cached_at = entity.cached_at;
    rec.modified_at = entity.modified_at;

    return rec;
  }

  toEntity(): HifiniThreadCacheModel {
    return {
      data_href: this.data_href,
      title: this.title,
      artist: this.artist,
      cover_src: this.cover_src,
      un_redirected_url: this.un_redirected_url,
      cached_at: this.cached_at
        ? new Date(this.cached_at)
        : undefined,
      modified_at: this.modified_at
        ? new Date(this.modified_at)
        : undefined,
    };
  }


}

