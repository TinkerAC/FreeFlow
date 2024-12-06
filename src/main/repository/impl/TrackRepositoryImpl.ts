import TrackRepository from '@main/repository/TrackRepository';
import {  inject } from 'inversify';
import { Track, TrackCreationAttributes } from '@main/models/Track';
import TrackMapper from '@main/repository/mappers/TrackMapper';
import { TrackModel } from '@src/shared/types';

export default class TrackRepositoryImpl implements TrackRepository {
  constructor(
    @inject('Track') private track: Track,
  ) {
  }

  delete(id: number): Promise<number> {
    return Track.destroy({ where: { track_id: id } });
  }

  async findAll(): Promise<TrackModel[]> {
    return Track.findAll().then((tracks) => {
      return tracks.map(TrackMapper.toDomain);
    });
  }


  findByDataHref(dataHref: string): Promise<TrackModel | null> {
    return Promise.resolve(undefined);
  }

  findByFilePath(filePath: string): Promise<TrackModel | null> {
    return Promise.resolve(undefined);
  }

  async findById(id: number): Promise<TrackModel | null> {
    const raw = await Track.findByPk(id);
    return TrackMapper.toDomain(raw);
  }

  async create(creationAttributes: TrackCreationAttributes): Promise<TrackModel> {
    const raw = await Track.create(creationAttributes);
    return TrackMapper.toDomain(raw);
  }



  update(track: TrackModel): Promise<TrackModel> {
    return Promise.resolve(undefined);
  }

}