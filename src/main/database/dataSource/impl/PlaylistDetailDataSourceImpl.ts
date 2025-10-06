import { PlaylistDetailDataSource } from '@main/database/dataSource/PlaylistDetailDataSource';
import { PlaylistDetailRecord } from '@main/database/record/PlaylistDetailRecord';
import { PlaylistDetail } from '@main/database/seqimpl/PlaylistDetail';
import { injectable } from 'inversify';

@injectable()
export class PlaylistDetailDataSourceImpl implements PlaylistDetailDataSource {
  async createFromRaw(playlistId: number, trackId: number): Promise<PlaylistDetailRecord> {
    const created = await PlaylistDetail.create({ playlist_id: playlistId, track_id: trackId });
    return Object.assign(new PlaylistDetailRecord(), created.get({ plain: true }));
  }

  async create(pd: PlaylistDetailRecord): Promise<PlaylistDetailRecord> {
    const created = await PlaylistDetail.create(pd);
    return Object.assign(new PlaylistDetailRecord(), created.get({ plain: true }));
  }

  async delete(playlist_id: number): Promise<number> {
    return PlaylistDetail.destroy({ where: { playlist_id } });
  }

  async findAll(): Promise<PlaylistDetailRecord[]> {
    const rows = await PlaylistDetail.findAll();
    return rows.map(r => Object.assign(new PlaylistDetailRecord(), r.get({ plain: true })));
  }

  async findById(id: number): Promise<PlaylistDetailRecord | null> {
    const row = await PlaylistDetail.findByPk(id);
    return row ? Object.assign(new PlaylistDetailRecord(), row.get({ plain: true })) : null;
  }

  async findByPlatformAndPlatformUniqueId(): Promise<null> {
    return null; // 不支持
  }

  async findOrCreate(pd: PlaylistDetailRecord): Promise<PlaylistDetailRecord> {
    const [row] = await PlaylistDetail.findOrCreate({
      where: { playlist_id: pd.playlist_id, track_id: pd.track_id },
      defaults: pd,
    });
    return Object.assign(new PlaylistDetailRecord(), row.get({ plain: true }));
  }

  async update(pd: PlaylistDetailRecord): Promise<PlaylistDetailRecord> {
    const model = await PlaylistDetail.findOne({
      where: { playlist_id: pd.playlist_id, track_id: pd.track_id },
    });
    if (!model) throw new Error('PlaylistDetail not found');
    const updated = await model.update(pd);
    return Object.assign(new PlaylistDetailRecord(), updated.get({ plain: true }));
  }

  async findByPlaylistId(playlistId: number): Promise<PlaylistDetailRecord[] | null> {
    const rows = await PlaylistDetail.findAll({ 
      where: { playlist_id: playlistId },
      order: [['position', 'ASC'], ['created_at', 'DESC']],
    });
    if (!rows.length) return null;
    return rows.map(r => Object.assign(new PlaylistDetailRecord(), r.get({ plain: true })));
  }

  async deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<number> {
    return PlaylistDetail.destroy({ where: { playlist_id: playlistId, track_id: trackId } });
  }

  async updatePositions(updates: Array<{ playlist_id: number; track_id: number; position: number }>): Promise<void> {
    // Use transaction for batch update
    await Promise.all(
      updates.map(({ playlist_id, track_id, position }) =>
        PlaylistDetail.update({ position }, { where: { playlist_id, track_id } })
      )
    );
  }
}