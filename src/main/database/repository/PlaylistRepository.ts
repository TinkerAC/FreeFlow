import { PlaylistModel } from '@src/shared/domainModel/playlistModel';


export default interface PlaylistRepository {


  create(playlist: PlaylistModel): Promise<PlaylistModel>;

  findAll(): Promise<PlaylistModel[]>;

  findById(id: number): Promise<PlaylistModel>;

  save(playlist: PlaylistModel): Promise<PlaylistModel>;

  delete(id: number): Promise<number>;

  update(playlist: PlaylistModel): Promise<PlaylistModel>;







}