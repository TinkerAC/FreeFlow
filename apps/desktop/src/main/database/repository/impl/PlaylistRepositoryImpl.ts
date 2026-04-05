// file: src/main/database/repository/impl/PlaylistRepositoryImpl.ts
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import { injectable } from 'inversify';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { PlaylistRecord } from '@main/database/record/PlaylistRecord';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Playlist } from '@main/database/seqimpl/Playlist';
import { PlaylistDetail } from '@main/database/seqimpl/PlaylistDetail';
import { Track } from '@main/database/seqimpl/Track';
import { TrackRecord } from '@main/database/record/TrackRecord';

const mapPlaylistRowToRecord = (row: Playlist): PlaylistRecord =>
  Object.assign(new PlaylistRecord(), row.get({ plain: true }));

const mapTrackRowToRecord = (row: Track): TrackRecord =>
  Object.assign(new TrackRecord(), row.get({ plain: true }));

@injectable()
export class PlaylistRepositoryImpl implements PlaylistRepository {
  async findAll(): Promise<PlaylistEntity[]> {
    const rows = await Playlist.findAll({
      order: [['position', 'ASC'], ['created_at', 'DESC']],
    });
    return rows.map(row => mapPlaylistRowToRecord(row).toEntity());
  }

  async delete(id: number): Promise<number> {
    return Playlist.destroy({ where: { playlist_id: id } });
  }

  async findById(id: number): Promise<PlaylistEntity | null> {
    const row = await Playlist.findByPk(id);
    return row ? mapPlaylistRowToRecord(row).toEntity() : null;
  }

  async save(entity: PlaylistEntity): Promise<PlaylistEntity> {
    return this.create(entity);
  }

  async update(entity: PlaylistEntity): Promise<PlaylistEntity> {
    await Playlist.update(
      {
        title: entity.title,
        description: entity.description,
        creator: entity.creator,
        position: entity.position,
        playlist_cover: entity.playlist_cover,
      },
      { where: { playlist_id: entity.playlist_id } },
    );
    const updated = await Playlist.findByPk(entity.playlist_id);
    if (!updated) {
      throw new Error(`Playlist not found: ${entity.playlist_id}`);
    }
    return mapPlaylistRowToRecord(updated).toEntity();
  }

  async create(entity: PlaylistEntity): Promise<PlaylistEntity> {
    const created = await Playlist.create(PlaylistRecord.fromEntity(entity) as any);
    return mapPlaylistRowToRecord(created).toEntity();
  }


  async findTracksByPlaylistId(playlistId: number): Promise<TrackEntity[]> {
    const details = await PlaylistDetail.findAll({
      where: { playlist_id: playlistId },
      order: [['position', 'ASC'], ['created_at', 'DESC']],
    });
    if (!details.length) {
      return [];
    }

    const trackIds = details.map(it => it.track_id);
    const tracks = await Track.findAll({ where: { id: trackIds } });
    return tracks.map(row => mapTrackRowToRecord(row).toEntity());

  }

  async deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<number> {
    return PlaylistDetail.destroy({ where: { playlist_id: playlistId, track_id: trackId } });
  }

  async createPlaylistDetail(playlistId: number, trackId: number): Promise<void> {
    await PlaylistDetail.create({ playlist_id: playlistId, track_id: trackId });

  }

  async updatePlaylistPositions(updates: Array<{ playlist_id: number; position: number }>): Promise<void> {
    await Promise.all(
      updates.map(({ playlist_id, position }) =>
        Playlist.update({ position }, { where: { playlist_id } }),
      ),
    );
  }

  async updateTrackPositions(playlistId: number, updates: Array<{
    track_id: number;
    position: number
  }>): Promise<void> {
    const detailUpdates = updates.map(u => ({ playlist_id: playlistId, track_id: u.track_id, position: u.position }));
    await Promise.all(
      detailUpdates.map(({ playlist_id, track_id, position }) =>
        PlaylistDetail.update({ position }, { where: { playlist_id, track_id } }),
      ),
    );
  }
}
