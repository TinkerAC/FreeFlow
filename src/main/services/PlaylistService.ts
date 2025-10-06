import { inject } from 'inversify';
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import TrackRepository from '@main/database/repository/TrackRepository';
import { fileExists } from '@src/utils/helpers';
import TrackService from '@main/services/TrackService';
import { Platform } from '@main/core/enum/Platform';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { DISymbol } from '@main/di/symbol';
import chalk from 'chalk';


export default class PlaylistService {
  constructor(
    @inject(DISymbol.PlaylistRepository) private playlistRepository: PlaylistRepository,
    @inject(DISymbol.TrackRepository) private trackRepository: TrackRepository,
    @inject(DISymbol.TrackService) private trackService: TrackService,
  ) {
  }


  public async getPlaylists(): Promise<PlaylistEntity[]> {
    try {
      // Step 1: 获取库中的所有 TrackRecord，并检查文件是否存在
      const libraryTracks: TrackEntity[] = await this.trackRepository.findAll();
      const validTracks: TrackEntity[] = [];

      for (const track of libraryTracks) {
        if (track.platform == Platform.LOCAL) {
          const file_exist = await fileExists(track.platform_unique_id);
          if (!file_exist) {
            console.warn(`歌曲文件不存在: ${track.platform_unique_id}`);
          } else {
            validTracks.push(track); // 仅保留存在的文件
          }
        } else {
          validTracks.push(track); // 网络资源直接保留
        }
      }

      console.log(`库中有效歌曲数量: ${validTracks.length} / ${libraryTracks.length}`);

      // Step 2: 获取所有歌单的基本信息
      const playlists: PlaylistEntity[] = await this.playlistRepository.findAll();

      console.log(chalk.green('PlaylistService: 获取到歌单数量:', playlists.length));

      // Step 3: 获取每个歌单对应的歌曲列表，并过滤无效歌曲
      for (const playlist of playlists) {

        // 根据歌曲ID从有效歌曲列表中获取歌曲
        // 过滤不存在的歌曲
        playlist.tracks = await this.trackService.findTracksByPlaylistId(playlist.playlist_id);
        console.log(`歌单: ${playlist.title} 获取到有效歌曲数量: ${playlist.tracks.length}`);
      }

      // Step 4: 添加音乐库歌单
      playlists.push(
        {
          playlist_id: 0,
          platform: Platform.LOCAL,
          platform_unique_id: '0',
          title: '音乐库',
          created_at: new Date(),
          tracks: validTracks,
          creator: '系统',
          description: '所有库中的音乐文件',
          modified_at: new Date(),
          playlist_cover: '',
        },
      );

      console.log(`共获取到歌单数量: ${playlists.length}`);
      // console.log('歌单信息:', playlist_result);

      // Step 5: 获取每首歌曲的详细信息,如 封面、时长等
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
                };
                return merged;
              } catch (error) {
                console.error(`Error fetching info for track ID ${track.id}:`, error);
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
      console.error('从数据库读取歌单时出错:', err);
      return [];
    }
  }


  public async addPlaylist(playlistModel: PlaylistEntity) {
    console.log('主进程: 添加歌单:', playlistModel);

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

    console.log(`正在添加歌曲到歌单，playlist_id: ${playlistId}, track:`, JSON.stringify(trackModel));
    try {
      //如果不在库中,则添加到库中
      const track = await this.trackRepository.findOrCreate(trackModel);
      await this.playlistRepository.createPlaylistDetail(playlistId, track.id);

      return track.id;
    } catch (error) {
      console.error('Error in add-track-to-playlist:', error);
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
    console.log('主进程: 修改歌单信息:', playlistModel);
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

  public async updateTrackPositions(playlistId: number, updates: Array<{ track_id: number; position: number }>): Promise<void> {
    await this.playlistRepository.updateTrackPositions(playlistId, updates);
  }

}
