import { TrackModel } from '@src/shared/types';
import { Track } from '@main/models/Track';

export default class TrackMapper {
  static toDomain(
    raw: Track,
  ): TrackModel {
    return {
      id: raw.id,
      platform: raw.platform,
      platform_unique_id: raw.platform_unique_id,
      title: raw.title,
      artist: raw.artist,
      album: raw.album,
      duration: raw.duration,
      cover_src: raw.cover_src,
      created_at: raw.created_at,
    };
  }


  static toEntity(
    model: TrackModel,
  ): Track {
    return Track.build({
      platform: model.platform,
      platform_unique_id: model.platform_unique_id,
      id: model.id,
      title: model.title,
      artist: model.artist,
      album: model.album,
      duration: model.duration,
      cover_src: model.cover_src,
      created_at: model.created_at,
    });
  }

}