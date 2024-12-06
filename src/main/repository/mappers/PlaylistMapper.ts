import { PlaylistModel } from '@src/shared/types';
import { Playlist } from '@main/models';


export default class PlaylistMapper {
  static toEntity(playlist: PlaylistModel): Playlist {
    return Playlist.build({
      playlist_id: playlist.playlist_id,
      title: playlist.title,
      description: playlist.description,
      creator: playlist.creator,
      created_at: playlist.created_at,
      modified_at: playlist.modified_at,
    });

  }

  static toModel(playlist: Playlist): PlaylistModel {
    return {
      playlist_id: playlist.playlist_id,
      title: playlist.title,
      description: playlist.description,
      created_at: playlist.created_at,
      creator: playlist.creator,
      modified_at: playlist.modified_at,
      tracks: [],

    };
  }
}