import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { TrackRecord } from '@main/database/record/TrackRecord';
import { Track } from '@main/database/seqimpl/Track';
import { injectable } from 'inversify';
import { Op } from 'sequelize';

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
    const where = (track.id !== undefined && track.id !== null)
      ? { id: track.id }
      : { platform: track.platform, platform_unique_id: track.platform_unique_id } as any;

    // 仅更新允许变动的字段，避免误写入 id/主键
    // 只包含非 null/undefined 的字段，避免违反数据库约束
    const payload: Partial<TrackRecord> = {
      modified_at: new Date(),
    };

    // 只添加非 null 和非 undefined 的字段
    if (track.title !== undefined && track.title !== null) payload.title = track.title;
    if (track.artist !== undefined && track.artist !== null) payload.artist = track.artist;
    if (track.album !== undefined && track.album !== null) payload.album = track.album;
    if (track.duration !== undefined && track.duration !== null) payload.duration = track.duration;
    if (track.cover_src !== undefined && track.cover_src !== null) payload.cover_src = track.cover_src;
    if (track.played_count !== undefined && track.played_count !== null) payload.played_count = track.played_count;

    await Track.update(payload, { where });

    const updated = await Track.findOne({ where });
    if (!updated) throw new Error('Track update failed: record not found after update');
    return Object.assign(new TrackRecord(), updated.get({ plain: true }));
  }

  async bindLocalFileToTrack(trackId: number, fileName: string): Promise<TrackRecord> {
    // 1. 执行更新，并检查受影响行数
    const operatingObject: Track = await Track.findByPk(trackId);
    if (!operatingObject) {
      throw new Error(`Track #${trackId} 查询不到记录`);
    }

    operatingObject.relative_local_path = fileName;

    await operatingObject.save();

    return Object.assign(new TrackRecord(), operatingObject.get({ plain: true }));
  }

  async findLocalFilePathByPlatformAndPlatformUniqueId(
    platform: string, platformUniqueId: string,
  ): Promise<string | null> {
    return Track.findOne({ where: { platform: platform, platform_unique_id: platformUniqueId } })
      .then((row) => {
        if (row) {
          return row.relative_local_path;
        }
        return null;
      }).catch();
  }

  /**
   * 搜索曲目,返回符合关键词的曲目列表
   * @param keywords
   * @param limit
   */
  async search(keywords: string, limit: number): Promise<TrackRecord[]> {
    const rows = await Track.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${keywords}%` } },
          { artist: { [Op.like]: `%${keywords}%` } },
          { album: { [Op.like]: `%${keywords}%` } },
        ],
      },
      limit: limit,
    });

    return rows.map(r => Object.assign(new TrackRecord(), r.get({ plain: true })));
  }


}
