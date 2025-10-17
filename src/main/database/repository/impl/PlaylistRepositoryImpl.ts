// file: src/main/database/repository/impl/PlaylistRepositoryImpl.ts
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import { inject, injectable } from 'inversify';
import { PlaylistDataSource } from '@main/database/dataSource/PlaylistDataSource';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { PlaylistRecord } from '@main/database/record/PlaylistRecord';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistDetailDataSource } from '@main/database/dataSource/PlaylistDetailDataSource';
import { TrackDataSource } from '@main/database/dataSource/TrackDataSource';
import { DISymbol } from '@main/di/symbol';


@injectable()
export class PlaylistRepositoryImpl implements PlaylistRepository {
  constructor(
    @inject(DISymbol.TrackDataSource) private trackDataSource: TrackDataSource,
    @inject(DISymbol.PlaylistDataSource) private ds: PlaylistDataSource,
    @inject(DISymbol.PlaylistDetailDataSource) private playlistDetailDataSource: PlaylistDetailDataSource,
  ) {
  }

  async findAll(): Promise<PlaylistEntity[]> {
    const recs = await this.ds.findAll();
    return recs.map(it => it.toEntity());
  }

  async delete(id: number): Promise<number> {
    return this.ds.delete(id);
  }

  async findById(id: number): Promise<PlaylistEntity | null> {
    const rec = await this.ds.findById(id);
    return rec ? rec.toEntity() : null;
  }

  async save(entity: PlaylistEntity): Promise<PlaylistEntity> {
    const rec = await this.ds.create(PlaylistRecord.fromEntity(entity));
    return rec.toEntity();
  }

  async update(entity: PlaylistEntity): Promise<PlaylistEntity> {
    const rec = await this.ds.update(PlaylistRecord.fromEntity(entity));
    return rec.toEntity();
  }

  async create(entity: PlaylistEntity): Promise<PlaylistEntity> {
    const rec = await this.ds.create(PlaylistRecord.fromEntity(entity));
    return rec.toEntity();
  }


  async findTracksByPlaylistId(playlistId: number): Promise<TrackEntity[]> {
    const records = await this.playlistDetailDataSource.findByPlaylistId(playlistId);
    if (!records) {
      return [];
    }

    const trackIds = records.map(it => it.track_id);
    const tracks = await this.trackDataSource.findByIds(trackIds);
    return tracks.map(it => it.toEntity());

  }

  async deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<number> {
    return await this.playlistDetailDataSource.deleteByPlaylistIdAndTrackId(playlistId, trackId);
  }

  async createPlaylistDetail(playlistId: number, trackId: number): Promise<void> {
    await this.playlistDetailDataSource.createFromRaw(playlistId, trackId);

  }

  async updatePlaylistPositions(updates: Array<{ playlist_id: number; position: number }>): Promise<void> {
    await this.ds.updatePositions(updates);
  }

  async updateTrackPositions(playlistId: number, updates: Array<{
    track_id: number;
    position: number
  }>): Promise<void> {
    const detailUpdates = updates.map(u => ({ playlist_id: playlistId, track_id: u.track_id, position: u.position }));
    await this.playlistDetailDataSource.updatePositions(detailUpdates);
  }
}