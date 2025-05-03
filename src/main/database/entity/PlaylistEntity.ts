export interface PlaylistEntityProps {
  playlist_id: number;
  playlist_cover?: string;
  title: string;
  description?: string;
  creator: string;
  platform: string;
  platform_unique_id: string;
  played_count: number;
  created_at?: Date;
  modified_at?: Date;
}

export class PlaylistEntity implements PlaylistEntityProps {
  playlist_id!: number;
  playlist_cover?: string;
  title!: string;
  description?: string;
  creator!: string;
  platform!: string;
  platform_unique_id!: string;
  played_count!: number;
  created_at?: Date;
  modified_at?: Date;

}