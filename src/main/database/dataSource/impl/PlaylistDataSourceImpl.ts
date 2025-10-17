import { PlaylistDataSource } from '@main/database/dataSource/PlaylistDataSource';
import { PlaylistRecord } from '@main/database/record/PlaylistRecord';
import { Playlist } from '@main/database/seqimpl/Playlist';
import { injectable } from 'inversify';

@injectable()
export class PlaylistDataSourceImpl implements PlaylistDataSource {
  async create(pl: PlaylistRecord): Promise<PlaylistRecord> {
    const created = await Playlist.create(pl);
    return Object.assign(new PlaylistRecord(), created.get({ plain: true }));
  }

  async delete(id: number): Promise<number> {
    return Playlist.destroy({ where: { playlist_id: id } });
  }

  async findAll(): Promise<PlaylistRecord[]> {
    const rows = await Playlist.findAll({
      order: [['position', 'ASC'], ['created_at', 'DESC']],
    });

    // console.debug('findAll rows:', rows);
    return rows.map(r => Object.assign(new PlaylistRecord(), r.get({ plain: true })));
  }

  async findById(id: number): Promise<PlaylistRecord | null> {
    const row = await Playlist.findByPk(id);
    return row ? Object.assign(new PlaylistRecord(), row.get({ plain: true })) : null;
  }

  async findByPlatformAndPlatformUniqueId(
    platform: string,
    platformUniqueId: string,
  ): Promise<PlaylistRecord | null> {
    const row = await Playlist.findOne({ where: { platform, platform_unique_id: platformUniqueId } });
    return row ? Object.assign(new PlaylistRecord(), row.get({ plain: true })) : null;
  }

  async findOrCreate(pl: PlaylistRecord): Promise<PlaylistRecord> {
    const [row] = await Playlist.findOrCreate({
      where: { platform: pl.platform, platform_unique_id: pl.platform_unique_id },
      defaults: pl,
    });
    return Object.assign(new PlaylistRecord(), row.get({ plain: true }));
  }

  async update(pl: PlaylistRecord): Promise<PlaylistRecord> {
    await Playlist.update(
      { title: pl.title, description: pl.description, creator: pl.creator, position: pl.position },
      { where: { playlist_id: pl.playlist_id } },
    );
    const updated = await Playlist.findByPk(pl.playlist_id);
    return Object.assign(new PlaylistRecord(), updated!.get({ plain: true }));
  }

  async updatePositions(updates: Array<{ playlist_id: number; position: number }>): Promise<void> {
    // Use transaction for batch update
    await Promise.all(
      updates.map(({ playlist_id, position }) =>
        Playlist.update({ position }, { where: { playlist_id } }),
      ),
    );
  }
}