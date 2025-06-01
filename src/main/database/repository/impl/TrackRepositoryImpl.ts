// file: src/main/database/repository/impl/TrackRepositoryImpl.ts
import TrackRepository from '@main/database/repository/TrackRepository';
import { inject, injectable } from 'inversify';
import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { TrackRecord } from '@main/database/record/TrackRecord';
import { DISymbol } from '@main/di/symbol';

@injectable()
export class TrackRepositoryImpl implements TrackRepository {
  constructor(
    @inject(DISymbol.TrackDataSource) private ds: TrackDataSource,
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

  async bindLocalFileToTrack(trackId: number, fileName: string): Promise<TrackEntity> {

    const updated = await this.ds.bindLocalFileToTrack(trackId, fileName);
    return updated.toEntity();
  }

  async findLocalFilePathByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<string | null> {
    return this.ds.findLocalFilePathByPlatformAndPlatformUniqueId(platform, platformUniqueId);
  }

  async increasePlayCount(track: TrackEntity): Promise<TrackEntity> {
    const rec = await this.ds.findByPlatformAndPlatformUniqueId(track.platform, track.platform_unique_id);
    if (!rec) {
      throw new Error(`Track not found for platform: ${track.platform}, unique ID: ${track.platform_unique_id}`);
    }
    rec.played_count += 1; // 增加播放次数
    const updatedRec = await this.ds.update(rec);
    return updatedRec.toEntity();
  }


}