import {
  HifiniTrackModel,
  LocalPlayTrackModel,
  NetEaseCloudMusicTrackModel,
  QQMusicTrackModel,
  TrackModel,
} from '@src/shared/types';
import { Track } from '@main/models/Track';
import { Platform } from '@main/enum/Platform';

export default class TrackMapper {
  static toDomain(
    raw: Track,
  ): TrackModel {

    // console.log('raw.platformContext', raw.platformContext, Platform.NET_EASE_CLOUD_MUSIC, Platform.LOCAL, Platform.HIFINI);
    switch (raw.platform) {
      case Platform.NET_EASE_CLOUD_MUSIC:
        return NetEaseCloudMusicTrackModel.build({
          id: raw.id,
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: raw.platform_unique_id,
          title: raw.title,
          artist: raw.artist,
          album: raw.album,
          duration: raw.duration,
          cover_src: raw.cover_src,
          created_at: raw.created_at,
        });

      case Platform.LOCAL:
        return LocalPlayTrackModel.build({
          id: raw.id,
          platform: Platform.LOCAL,
          platform_unique_id: raw.platform_unique_id,
          title: raw.title,
          artist: raw.artist,
          album: raw.album,
          duration: raw.duration,
          cover_src: raw.cover_src,
          created_at: raw.created_at,
        });
      case Platform.HIFINI:
        return HifiniTrackModel.build({
          id: raw.id,
          platform: Platform.HIFINI,
          platform_unique_id: raw.platform_unique_id,
          title: raw.title,
          artist: raw.artist,
          album: raw.album,
          duration: raw.duration,
          cover_src: raw.cover_src,
          created_at: raw.created_at,
        });
      case Platform.QQ_MUSIC:
        return QQMusicTrackModel.build({
          id: raw.id,
          platform: Platform.QQ_MUSIC,
          platform_unique_id: raw.platform_unique_id,
          title: raw.title,
          artist: raw.artist,
          album: raw.album,
          duration: raw.duration,
          cover_src: raw.cover_src,
          created_at: raw.created_at,
        });

      default:
        throw new Error('Not implemented');
    }
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