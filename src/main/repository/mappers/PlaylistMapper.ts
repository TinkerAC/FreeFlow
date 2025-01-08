import { PlaylistModel } from '@src/shared/types';
import { Playlist } from '@main/models';
import { Platform } from '@main/enum/Platform';


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
      is_persistent: true,
      playlist_id: playlist.playlist_id,
      cover_src: playlist.playlist_cover,
      platform: Platform[playlist.platform as keyof typeof Platform],
      platform_unique_id: playlist.platform_unique_id,
      title: playlist.title,
      description: playlist.description,
      created_at: playlist.created_at,
      creator: playlist.creator,
      modified_at: playlist.modified_at,
      tracks: [],

    };
  }
}