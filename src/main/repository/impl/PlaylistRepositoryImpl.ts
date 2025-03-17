import { PlaylistModel } from '@src/shared/types';
import PlaylistRepository from '@main/repository/PlaylistRepository';
import { Playlist } from '@main/models/Playlist';
import PlaylistMapper from '@main/repository/mappers/PlaylistMapper';


export default class PlaylistRepositoryImpl implements PlaylistRepository {


  async findAll(): Promise<PlaylistModel[]> {
    const playlists = await Playlist.findAll();
    return playlists.map(PlaylistMapper.toModel);
  }

  delete(id: number): Promise<number> {
    return Playlist.destroy({
      where: {
        playlist_id: id,
      },
    });
  }

  async findById(id: number): Promise<PlaylistModel> {
    const playlist = await Playlist.findByPk(id);
    return PlaylistMapper.toModel(playlist);
  }

  async save(playlist: PlaylistModel): Promise<PlaylistModel> {
    const playlist_1 = await Playlist.create({
      platform: playlist.platform,
      platform_unique_id: playlist.platform_unique_id,
      title: playlist.title,
      description: playlist.description,
      creator: playlist.creator,
      created_at: playlist.created_at,
      modified_at: playlist.modified_at,
    });
    return PlaylistMapper.toModel(playlist_1);
  }

  async update(playlist: PlaylistModel): Promise<PlaylistModel> {

    await Playlist.update({
      title: playlist.title,
      description: playlist.description,
    }, {
      where: {
        playlist_id: playlist.playlist_id,
      },
    });
    return playlist;

  }


  async create(playlist: PlaylistModel): Promise<PlaylistModel> {
    const playlist_1 = await Playlist.create(
      {
        platform: playlist.platform,
        platform_unique_id: playlist.platform_unique_id,
        title: playlist.title,
        description: playlist.description,
        creator: playlist.creator,
        created_at: playlist.created_at,
        modified_at: playlist.modified_at,
      });
    return PlaylistMapper.toModel(playlist_1);
  }
}