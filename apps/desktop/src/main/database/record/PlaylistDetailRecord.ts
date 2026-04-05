import { AbstractRecord } from '@main/database/record/AbstractRecord';
import { AbstractEntity } from '@src/shared/domainModel/AbstractEntity';

export interface PlaylistDetailRecordProps {
  playlist_id: number;
  track_id: number;
  position?: number;
  created_at?: Date;
  modified_at?: Date;
}

export class PlaylistDetailRecord extends AbstractRecord implements PlaylistDetailRecordProps {
  playlist_id!: number;
  track_id!: number;
  position?: number;
  created_at?: Date;
  modified_at?: Date;


  toEntity(): AbstractEntity {
    return undefined;
  }
}