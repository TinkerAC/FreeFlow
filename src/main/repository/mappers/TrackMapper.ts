import { TrackModel } from '@src/shared/types';
import { Track } from '@main/models/Track';

export default class TrackMapper {
  static toDomain(
    raw: Track,
  ): TrackModel {
    return {
      data_href: raw.data_href,
      file_path: raw.file_path,
      track_id: raw.track_id,
      title: raw.title,
      artist: raw.artist,
      album: raw.album,
      duration: raw.duration,
      cover_src: raw.cover_src,
      created_at: raw.created_at,
      source: 'local',
    };
  }


  static toEntity(
    model: TrackModel,
  ): Track {
    return Track.build({
      data_href: model.data_href,
      file_path: model.file_path,
      track_id: model.track_id,
      title: model.title,
      artist: model.artist,
      album: model.album,
      duration: model.duration,
      cover_src: model.cover_src,
      created_at: model.created_at,
    });
  }

}