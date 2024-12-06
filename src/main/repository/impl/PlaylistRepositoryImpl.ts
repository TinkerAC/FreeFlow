import { PlaylistModel } from '@src/shared/types';
import PlaylistRepository from '@main/repository/PlaylistRepository';
import { Error } from 'sequelize';
import { Playlist } from '@main/models/Playlist';
import PlaylistMapper from '@main/repository/mappers/PlaylistMapper';


export default class PlaylistRepositoryImpl implements PlaylistRepository {


  async findAll(): Promise<PlaylistModel[]> {
    const playlists = await Playlist.findAll();
    return playlists.map(PlaylistMapper.toModel);
  }

  delete(id: number): Promise<number> {
    return Promise.resolve(0);
  }

  findById(id: number): Promise<PlaylistModel> {
    return Promise.resolve(undefined);
  }

  save(playlist: PlaylistModel): Promise<PlaylistModel> {
    return Promise.resolve(undefined);
  }

  update(playlist: PlaylistModel): Promise<PlaylistModel> {
    return Promise.resolve(undefined);
  }



  async create(playlist: PlaylistModel): Promise<PlaylistModel> {
    const playlist_1 = await Playlist.create(
      {
        title: playlist.title,
        description: playlist.description,
        creator: playlist.creator,
        created_at: playlist.created_at,
        modified_at: playlist.modified_at,
      });
    return PlaylistMapper.toModel(playlist_1);
  }
}