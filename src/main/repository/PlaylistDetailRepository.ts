import { PlaylistDetail, PlaylistDetailCreationAttributes } from '@main/models/PlaylistDetail';

export default interface PlaylistDetailRepository {
  findAll(): Promise<PlaylistDetail[]>;

  findById(id: number): Promise<PlaylistDetail | null>;

  create(attributes: PlaylistDetailCreationAttributes): Promise<PlaylistDetail>;

  update(playlistId: number, trackId: number, attributes: Partial<PlaylistDetailCreationAttributes>): Promise<PlaylistDetail | null>;

  delete(id: number): Promise<void>;

  deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<void>;

  findTrackIdsByPlaylistId(playlistId: number): Promise<number[]>;
}