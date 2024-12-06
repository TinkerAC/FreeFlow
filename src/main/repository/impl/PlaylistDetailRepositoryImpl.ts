// src/repositories/PlaylistDetailRepositoryImpl.ts

import { inject, injectable } from 'inversify';
import { PlaylistDetail, PlaylistDetailCreationAttributes } from '@main/models/PlaylistDetail';
import PlaylistDetailRepository from '@main/repository/PlaylistDetailRepository';

@injectable()
export default class PlaylistDetailRepositoryImpl implements PlaylistDetailRepository {

  constructor(
    @inject('PlaylistDetail') private playlistDetail: PlaylistDetail,
  ) {

  }

  /**
   * 获取所有 PlaylistDetail 记录
   */
  public async findAll(): Promise<PlaylistDetail[]> {
    return PlaylistDetail.findAll();
  }

  /**
   * 通过 ID 获取单个 PlaylistDetail 记录
   * @param id 记录的 ID
   */
  public async findById(id: number): Promise<PlaylistDetail | null> {
    return PlaylistDetail.findByPk(id);
  }

  /**
   * 创建新的 PlaylistDetail 记录
   * @param attributes 创建属性
   */
  public async create(attributes: PlaylistDetailCreationAttributes): Promise<PlaylistDetail> {
    return PlaylistDetail.create(attributes);
  }

  /**
   * 更新 PlaylistDetail 记录
   * @param playlistId 歌单 ID
   * @param trackId 歌曲 ID
   * @param attributes 更新属性
   */
  public async update(
    playlistId: number,
    trackId: number,
    attributes: Partial<PlaylistDetailCreationAttributes>,
  ): Promise<PlaylistDetail | null> {
    const playlistDetail = await PlaylistDetail.findOne({ where: { playlist_id: playlistId, track_id: trackId } });
    if (!playlistDetail) {
      return null;
    }
    return playlistDetail.update(attributes);
  }

  /**
   * 删除 PlaylistDetail 记录
   * @param id 记录的 ID
   */
  public async delete(id: number): Promise<void> {
    const playlistDetail = await PlaylistDetail.findByPk(id);
    if (playlistDetail) {
      await playlistDetail.destroy();
    }
  }

  /**
   * 通过歌单 ID 和歌曲 ID 删除记录
   * @param playlistId 歌单 ID
   * @param trackId 歌曲 ID
   */
  public async deleteByPlaylistIdAndTrackId(playlistId: number, trackId: number): Promise<void> {
    await PlaylistDetail.destroy({ where: { playlist_id: playlistId, track_id: trackId } });
  }

  /**
   * 保存（更新）一个 PlaylistDetail 实例
   * @param playlistDetail 要保存的实例
   */
  public async save(playlistDetail: PlaylistDetail): Promise<PlaylistDetail> {
    return playlistDetail.save();
  }

  async findTrackIdsByPlaylistId(playlistId: number): Promise<number[]> {
    return PlaylistDetail.findAll({
      attributes: ['track_id'],
      where: { playlist_id: playlistId },
    }).then((playlistDetails) => {
      return playlistDetails.map((pd) => pd.track_id);
    });

  }
}
