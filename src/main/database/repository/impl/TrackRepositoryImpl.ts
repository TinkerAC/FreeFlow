// file: src/main/database/repository/impl/TrackRepositoryImpl.ts
import TrackRepository from '@main/database/repository/TrackRepository';
import { inject, injectable } from 'inversify';
import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { TrackRecord } from '@main/database/record/TrackRecord';

@injectable()
export class TrackRepositoryImpl implements TrackRepository {
  constructor(
    @inject('TrackDataSource') private ds: TrackDataSource,
  ) {
  }

  async delete(id: number): Promise<number> {
    return this.ds.delete(id);
  }

  async findAll(): Promise<TrackEntity[]> {
    const recs = await this.ds.findAll();
    return recs.map(it => it.toEntity());
  }

  async findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<TrackEntity | null> {
    const rec = await this.ds.findByPlatformAndPlatformUniqueId(platform, platformUniqueId);
    return rec ? rec.toEntity() : null;
  }

  async findById(id: number): Promise<TrackEntity | null> {
    const rec = await this.ds.findById(id);
    return rec ? rec.toEntity() : null;
  }

  async create(model: TrackEntity): Promise<TrackEntity> {
    const rec = await this.ds.create(TrackRecord.fromEntity(model));
    return rec.toEntity();
  }

  async update(entity: TrackEntity): Promise<TrackEntity> {
    const rec = await this.ds.update(TrackRecord.fromEntity(entity));
    return rec.toEntity();
  }

  async findOrCreate(model: TrackEntity): Promise<TrackEntity> {
    const rec = await this.ds.findOrCreate(TrackRecord.fromEntity(model));
    return rec.toEntity();
  }
}