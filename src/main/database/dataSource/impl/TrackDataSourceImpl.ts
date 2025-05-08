import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { TrackRecord } from '@main/database/record/TrackRecord';
import { Track } from '@main/database/seqimpl/Track';
import { injectable } from 'inversify';

@injectable()
export class TrackDataSourceImpl implements TrackDataSource {
  async create(track: TrackRecord): Promise<TrackRecord> {
    const created = await Track.create(track);
    return Object.assign(new TrackRecord(), created.get({ plain: true }));
  }

  async delete(id: number): Promise<number> {
    return Track.destroy({ where: { id } });
  }

  async findAll(): Promise<TrackRecord[]> {
    const rows = await Track.findAll();
    return rows.map(r => Object.assign(new TrackRecord(), r.get({ plain: true })));
  }

  async findById(id: number): Promise<TrackRecord | null> {
    const row = await Track.findByPk(id);
    return row ? Object.assign(new TrackRecord(), row.get({ plain: true })) : null;
  }

  async findByIds(ids: number[]): Promise<TrackRecord[]> {
    const rows = await Track.findAll({ where: { id: ids } });
    return rows.map(r => Object.assign(new TrackRecord(), r.get({ plain: true })));
  }

  async findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<TrackRecord | null> {
    const row = await Track.findOne({ where: { platform, platform_unique_id: platformUniqueId } });
    return row ? Object.assign(new TrackRecord(), row.get({ plain: true })) : null;
  }

  async findOrCreate(track: TrackRecord): Promise<TrackRecord> {
    const [row] = await Track.findOrCreate({
      where: { platform: track.platform, platform_unique_id: track.platform_unique_id },
      defaults: track,
    });
    return Object.assign(new TrackRecord(), row.get({ plain: true }));
  }

  async update(track: TrackRecord): Promise<TrackRecord> {
    await Track.update(track, { where: { id: track.id } });
    const updated = await Track.findByPk(track.id);
    return Object.assign(new TrackRecord(), updated!.get({ plain: true }));
  }
}