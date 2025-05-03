import TrackRepository from '@main/database/repository/TrackRepository';
import { inject } from 'inversify';
import { Track } from '@main/database/seqimpl/Track';
import TrackMapper from '@main/database/repository/mappers/TrackMapper';

import { TrackModel } from '@src/shared/domainModel/TrackModel';

export default class TrackRepositoryImpl implements TrackRepository {
  constructor(
    @inject('Track') private track: Track,
  ) {
  }

  async delete(id: number): Promise<number> {
    return await Track.destroy({ where: { id: id } });
  }

  async findAll(): Promise<TrackModel[]> {
    return Track.findAll().then((tracks) => {
      return tracks.map(TrackMapper.toDomain);
    });
  }


  async findByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<TrackModel | null> {
    const raw: Track | null = await Track.findOne({
      where: {
        platform: platform,
        platform_unique_id: platformUniqueId,
      },
    });
    return raw ? TrackMapper.toDomain(raw) : null;
  }

  async findById(id: number): Promise<TrackModel | null> {
    const raw: Track | null = await Track.findByPk(id);

    return raw ? TrackMapper.toDomain(raw) : null;
  }


  async create(
    trackModel: TrackModel): Promise<TrackModel> {
    //确保id 不被传入
    delete trackModel.id;
    delete trackModel.created_at;
    delete trackModel.modified_at;

    const raw: Track = await Track.create(
      {
        platform: trackModel.platform,
        platform_unique_id: trackModel.platform_unique_id,
        title: trackModel.title,
        artist: trackModel.artist,
        album: trackModel.album,
        duration: trackModel.duration,
        cover_src: trackModel.cover_src,
      },
    );
    return TrackMapper.toDomain(raw);
  }


  async update(track: TrackModel): Promise<TrackModel> {
    return await Track.update({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      cover_src: track.cover_src,
    }, {
      where: {
        id: track.id,
      },
    }).then(() => {
      return track;
    });
  }

  async findOrCreate(trackModel: TrackModel): Promise<TrackModel> {

    const track = await Track.findOne({
      where: {
        platform: trackModel.platform,
        platform_unique_id: trackModel.platform_unique_id,
      },
    });

    if (track) {
      return TrackMapper.toDomain(track);
    }
    return await this.create(trackModel);

  }
}