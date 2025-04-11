import TrackRepository from '@main/repository/TrackRepository';
import { inject } from 'inversify';
import { Track, TrackCreationAttributes } from '@main/models/Track';
import TrackMapper from '@main/repository/mappers/TrackMapper';
import { TrackModel } from '@src/shared/types';

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


  async create(creationAttributes: TrackCreationAttributes): Promise<TrackModel> {

    //确保id 不被传入
    delete creationAttributes.id;
    delete creationAttributes.created_at;
    delete creationAttributes.modified_at;
    const raw: Track = await Track.create(creationAttributes);

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

  async findOrCreate(creationAttributes: TrackCreationAttributes): Promise<TrackModel> {

    const track = await Track.findOne({
      where: {
        platform: creationAttributes.platform,
        platform_unique_id: creationAttributes.platform_unique_id,
      },
    });

    if (track) {
      return TrackMapper.toDomain(track);
    }
    return await this.create(creationAttributes);

  }
}