export interface TrackEntityProps {
  id: number;
  platform: string;
  platform_unique_id: string;
  title?: string;
  artist?: string;
  album: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  created_at?: Date;
  modified_at?: Date;
}

export class TrackEntity implements TrackEntityProps {
  id!: number;
  platform!: string;
  platform_unique_id!: string;
  title?: string;
  artist?: string;
  album!: string;
  duration?: number;
  cover_src?: string;
  lyrics?: string;
  created_at?: Date;
  modified_at?: Date;

}