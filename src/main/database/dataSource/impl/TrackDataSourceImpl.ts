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
    await Track.update(track, { where: { id: track.id } });
    const updated = await Track.findByPk(track.id);
    return Object.assign(new TrackRecord(), updated!.get({ plain: true }));
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