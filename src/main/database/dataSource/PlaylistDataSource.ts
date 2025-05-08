import { PlaylistRecord } from '@main/database/record/PlaylistRecord';


export interface PlaylistDataSource {
  findAll(): Promise<PlaylistRecord[]>;

  findById(id: number): Promise<PlaylistRecord | null>;

  create(playListModel: PlaylistRecord): Promise<PlaylistRecord>;

  delete(id: number): Promise<number>;

  update(playList: PlaylistRecord): Promise<PlaylistRecord>;

  findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<PlaylistRecord | null>;

  findOrCreate(playListModel: PlaylistRecord): Promise<PlaylistRecord>;
}