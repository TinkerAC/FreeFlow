export interface PlaylistDetailEntityProps {
  playlist_id: number;
  track_id: number;
  created_at?: Date;
  modified_at?: Date;
}

export class PlaylistDetailEntity implements PlaylistDetailEntityProps {
  playlist_id!: number;
  track_id!: number;
  created_at?: Date;
  modified_at?: Date;
}