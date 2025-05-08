import { PlaylistDetailRecord } from '@main/database/record/PlaylistDetailRecord';

export interface PlaylistDetailDataSource {

  findAll(): Promise<PlaylistDetailRecord[]>;

  findById(id: number): Promise<PlaylistDetailRecord | null>;

  create(detailRecord: PlaylistDetailRecord): Promise<PlaylistDetailRecord>;

  createFromRaw(playlistId: number, trackId: number): Promise<PlaylistDetailRecord>;

  delete(id: number): Promise<number>;

  update(playlistDetail: PlaylistDetailRecord): Promise<PlaylistDetailRecord>;

  findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<PlaylistDetailRecord | null>;

  findOrCreate(playlistDetailModel: PlaylistDetailRecord): Promise<PlaylistDetailRecord>;


  findByPlaylistId(playlistId: number): Promise<PlaylistDetailRecord[] | null>;


  deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<number>;
}