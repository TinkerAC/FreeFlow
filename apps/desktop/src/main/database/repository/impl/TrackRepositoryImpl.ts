// file: src/main/database/repository/impl/TrackRepositoryImpl.ts
import TrackRepository from '@main/database/repository/TrackRepository';
import { injectable } from 'inversify';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { TrackRecord } from '@main/database/record/TrackRecord';
import { Track } from '@main/database/seqimpl/Track';
import { Op, WhereOptions } from 'sequelize';

@injectable()
export class TrackRepositoryImpl implements TrackRepository {
  private mapToRecord(row: Track): TrackRecord {
    return Object.assign(new TrackRecord(), row.get({ plain: true }));
  }

  async delete(id: number): Promise<number> {
    return Track.destroy({ where: { id } });
  }

  async findAll(): Promise<TrackEntity[]> {
    const rows = await Track.findAll();
    return rows.map(row => this.mapToRecord(row).toEntity());
  }

  async findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<TrackEntity | null> {
    const row = await Track.findOne({ where: { platform, platform_unique_id: platformUniqueId } });
    return row ? this.mapToRecord(row).toEntity() : null;
  }

  async findById(id: number): Promise<TrackEntity | null> {
    const row = await Track.findByPk(id);
    return row ? this.mapToRecord(row).toEntity() : null;
  }

  async create(model: TrackEntity): Promise<TrackEntity> {
    const created = await Track.create(TrackRecord.fromEntity(model) as any);
    return this.mapToRecord(created).toEntity();
  }

  async update(entity: TrackEntity): Promise<TrackEntity> {
    const record = TrackRecord.fromEntity(entity);
    const where: WhereOptions = (entity.id !== undefined && entity.id !== null)
      ? { id: entity.id }
      : { platform: entity.platform, platform_unique_id: entity.platform_unique_id };

    const payload: Partial<TrackRecord> = {
      modified_at: new Date(),
    };

    if (record.title !== undefined && record.title !== null) payload.title = record.title;
    if (record.artist !== undefined && record.artist !== null) payload.artist = record.artist;
    if (record.album !== undefined && record.album !== null) payload.album = record.album;
    if (record.duration !== undefined && record.duration !== null) payload.duration = record.duration;
    if (record.cover_src !== undefined && record.cover_src !== null) payload.cover_src = record.cover_src;
    if (record.played_count !== undefined && record.played_count !== null) payload.played_count = record.played_count;

    await Track.update(payload, { where });

    const updated = await Track.findOne({ where });
    if (!updated) throw new Error('Track update failed: record not found after update');
    return this.mapToRecord(updated).toEntity();
  }

  async findOrCreate(model: TrackEntity): Promise<TrackEntity> {
    const [row] = await Track.findOrCreate({
      where: { platform: model.platform, platform_unique_id: model.platform_unique_id },
      defaults: TrackRecord.fromEntity(model) as any,
    });
    return this.mapToRecord(row).toEntity();
  }

  async bindLocalFileToTrack(trackId: number, fileName: string): Promise<TrackEntity> {

    const row = await Track.findByPk(trackId);
    if (!row) {
      throw new Error(`Track #${trackId} 查询不到记录`);
    }

    row.relative_local_path = fileName;
    await row.save();

    return this.mapToRecord(row).toEntity();
  }

  async findLocalFilePathByPlatformAndPlatformUniqueId(platform: string, platformUniqueId: string): Promise<string | null> {
    const row = await Track.findOne({ where: { platform, platform_unique_id: platformUniqueId } });
    return row ? row.relative_local_path : null;
  }

  async increasePlayCount(track: TrackEntity): Promise<TrackEntity> {
    const row = await Track.findOne({ where: { platform: track.platform, platform_unique_id: track.platform_unique_id } });
    if (!row) {
      throw new Error(`Track not found for platform: ${track.platform}, unique ID: ${track.platform_unique_id}`);
    }

    // 只更新 played_count 字段，避免更新其他可能为 null 的字段
    row.played_count = (row.played_count || 0) + 1;
    row.modified_at = new Date();

    await row.save({ fields: ['played_count', 'modified_at'] });
    return this.mapToRecord(row).toEntity();
  }

  async localSearch(term: string, limit: number): Promise<TrackEntity[]> {
    const rows = await Track.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${term}%` } },
          { artist: { [Op.like]: `%${term}%` } },
          { album: { [Op.like]: `%${term}%` } },
        ],
      },
      limit,
    });
    return rows.map(row => this.mapToRecord(row).toEntity());
  }
}
