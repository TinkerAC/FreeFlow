import { inject } from 'inversify';
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import TrackRepository from '@main/database/repository/TrackRepository';
import TrackService from '@main/services/TrackService';
import { Platform } from '@main/core/enum/Platform';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { DISymbol } from '@main/di/symbol';
import chalk from 'chalk';
import { AbstractService } from '@main/services/AbstractService';
import { Logger } from 'winston';


export default class PlaylistService extends AbstractService {
  constructor(
    @inject(DISymbol.PlaylistRepository) private playlistRepository: PlaylistRepository,
    @inject(DISymbol.TrackRepository) private trackRepository: TrackRepository,
    @inject(DISymbol.TrackService) private trackService: TrackService,
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
  }


  public async getPlaylists(): Promise<PlaylistEntity[]> {
    try {
      const playlists: PlaylistEntity[] = await this.playlistRepository.findAll();

      this.logger.info(chalk.green('PlaylistService: 获取到歌单数量:', playlists.length));

      for (const playlist of playlists) {
        playlist.tracks = await this.trackService.findTracksByPlaylistId(playlist.playlist_id);
        this.logger.info(`歌单: ${playlist.title} 获取到有效歌曲数量: ${playlist.tracks.length}`);
      }

      this.logger.info(`共获取到歌单数量: ${playlists.length}`);

      return await Promise.all(
        playlists.map(async (playlist: PlaylistEntity) => {
          const tracksWithInfo = await Promise.allSettled(
            playlist.tracks.map(async (track) => {
              try {
                const info = await this.trackService.getTrackInfo(track.platform, track.platform_unique_id);
                // 合并策略：以数据库中的可编辑字段为准（title/artist/album）
                // 仅用拉取的信息补充非编辑字段（duration/cover_src 等）
                const merged = {
                  ...info,
                  // 以下字段优先使用数据库（track）当前值，避免覆盖用户编辑
                  title: (track.title ?? info?.title) as any,
                  artist: (track.artist ?? info?.artist) as any,
                  album: (track.album ?? info?.album) as any,
                  // 封面/时长优先使用 info（如果存在），否则保留 db 值
                  cover_src: (info?.cover_src ?? track.cover_src) as any,
                  duration: (info?.duration ?? track.duration) as any,
                  id: track.id,
                  platform: track.platform,
                  platform_unique_id: track.platform_unique_id,
                  created_at: track.created_at,
                  modified_at: track.modified_at,
                  played_count: track.played_count,
                  downloaded: track.downloaded,
                  download_status: track.download_status,
                  download_source_cid: track.download_source_cid,
                  download_source_gateway: track.download_source_gateway,
                  download_error: track.download_error,
                  downloaded_at: track.downloaded_at,
                  freeflow: track.freeflow ?? info?.freeflow,
                };
                return merged;
              } catch (error) {
                this.logger.error(`Error fetching info for track ID ${track.id}:`, error);
                return track; // 回退到数据库记录，而不是丢弃
              }
            }),
          );

          // 移除发生错误的 track
          const validTracks = tracksWithInfo
            .filter((result) => result.status === 'fulfilled' && result.value)
            .map((result) => (result as PromiseFulfilledResult<TrackEntity>).value as TrackEntity);

          return {
            ...playlist,
            tracks: validTracks,
          };
        }),
      );

    } catch (err) {
      // 错误处理：捕获并记录所有错误
      this.logger.error('从数据库读取歌单时出错:', err);
      return [];
    }
  }


  public async addPlaylist(playlistModel: PlaylistEntity) {
    this.logger.info('主进程: 添加歌单:', playlistModel);

    const track_collection: TrackEntity[] = [];
    // add All Platform Tracks to Library
    for (const track of playlistModel.tracks) {
      track_collection.push(await this.trackRepository.findOrCreate(track));
    }

    const new_playlist = await this.playlistRepository.create(playlistModel);

    // add All Platform Tracks to Playlist
    for (const track of track_collection) {
      await this.addTrackToPlaylist(new_playlist.playlist_id, track);
    }
  }

  public async addTrackToPlaylist(playlistId: number, trackModel: TrackEntity) {

    this.logger.info(`正在添加歌曲到歌单，playlist_id: ${playlistId}, track:`, JSON.stringify(trackModel));
    try {
      if (trackModel.platform === Platform.FREEFLOW) {
        const existing = await this.trackRepository.findByPlatformAndPlatformUniqueId(
          trackModel.platform,
          trackModel.platform_unique_id,
        );
        if (!existing?.id) {
          throw new Error('FreeFlow 资源需要先加入链上音乐库，不能直接缓存搜索结果');
        }

        await this.playlistRepository.createPlaylistDetail(playlistId, existing.id);
        return existing.id;
      }

      //如果不在库中,则添加到库中
      const track = await this.trackRepository.findOrCreate(trackModel);
      await this.playlistRepository.createPlaylistDetail(playlistId, track.id);

      return track.id;
    } catch (error) {
      this.logger.error('Error in add-track-to-playlist:', error);
      throw error;
    }
  }


  public async creatNewEmptyPlaylist() {
    return this.playlistRepository.create({
      playlist_cover: '',
      tracks: [],
      title: '新建歌单',
      description: '',
      creator: '系统',
      created_at: new Date(),
      modified_at: new Date(),
      platform: Platform.LOCAL,
      platform_unique_id: '0',
    });
  }

  public async modifyPlaylist(
    playlistModel: PlaylistEntity,
  ) {
    this.logger.info('主进程: 修改歌单信息:', playlistModel);
    await this.playlistRepository.update(playlistModel);
  }


  public async removeTrackFromPlaylist(
    playlistId: number
    , track: TrackEntity,
  ) {
    return this.playlistRepository.deleteByPlaylistIdAndTrackId(playlistId, track.id);
  }


  public async removePlaylist(playlistId: number) {
    return this.playlistRepository.delete(playlistId);
  }


  public async increasePlayedCount(playlistId: number) {
    const playlist = await this.playlistRepository.findById(playlistId);
    if (playlist) {
      playlist.played_count += 1;
      await this.playlistRepository.update(playlist);
      return playlist.played_count;
    } else {
      throw new Error(`Playlist with ID ${playlistId} not found`);
    }
  }

  public async updatePlaylistPositions(updates: Array<{ playlist_id: number; position: number }>): Promise<void> {
    await this.playlistRepository.updatePlaylistPositions(updates);
  }

  public async updateTrackPositions(playlistId: number, updates: Array<{
    track_id: number;
    position: number
  }>): Promise<void> {
    await this.playlistRepository.updateTrackPositions(playlistId, updates);
  }

}
