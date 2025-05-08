import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';


export default interface PlaylistRepository {


  create(playlist: PlaylistEntity): Promise<PlaylistEntity>;

  findAll(): Promise<PlaylistEntity[]>;

  findById(id: number): Promise<PlaylistEntity>;

  save(playlist: PlaylistEntity): Promise<PlaylistEntity>;

  delete(id: number): Promise<number>;

  update(playlist: PlaylistEntity): Promise<PlaylistEntity>;


  findTracksByPlaylistId(playlistId: number): Promise<TrackEntity[]>;

  deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<number>;

  createPlaylistDetail(playlistId: number, trackId: number): Promise<void>;


}