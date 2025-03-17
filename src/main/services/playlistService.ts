import { inject } from 'inversify';
import { PlaylistModel, TrackModel } from '@src/shared/types';
import PlaylistRepository from '@main/repository/PlaylistRepository';
import TrackRepository from '@main/repository/TrackRepository';
import PlaylistDetailRepository from '@main/repository/PlaylistDetailRepository';
import { fileExists } from '@src/utils/helpers';
import TrackService from '@main/services/TrackService';
import HifiniMusicService from '@main/services/HifiniMusicService';
import ElectronStore from 'electron-store';
import { Platform } from '@main/enum/Platform';


export default class PlaylistService {
  constructor(
    @inject('Store') private store: ElectronStore,
    @inject('PlaylistRepository') private playlistRepository: PlaylistRepository,
    @inject('TrackRepository') private trackRepository: TrackRepository,
    @inject('PlaylistDetailRepository') private playlistDetailRepository: PlaylistDetailRepository,
    @inject('TrackService') private trackService: TrackService,
    @inject('HifiniMusicService') private hifiniMusicService: HifiniMusicService,
  ) {
  }


  public async getPlaylists(): Promise<PlaylistModel[]> {

    try {
      // Step 1: 获取库中的所有 TrackModel，并检查文件是否存在
      const libraryTracks: TrackModel[] = await this.trackRepository.findAll();
      const validTracks: TrackModel[] = [];

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
      const playlists: PlaylistModel[] = await this.playlistRepository.findAll();

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
          cover_src: '',

        },
      );

      console.log(`共获取到歌单数量: ${playlists.length}`);
      // console.log('歌单信息:', playlists);

      // Step 5: 获取每首歌曲的详细信息
      return await Promise.all(
        playlists.map(async (playlist: PlaylistModel) => {
          const tracksWithInfo = await Promise.allSettled(
            playlist.tracks.map(async (track) => {
              try {
                const trackInfo = await this.trackService.getTrackInfo(track.platform, track.platform_unique_id);
                return {
                  ...track,
                  ...trackInfo,
                };
              } catch (error) {
                console.error(`Error fetching info for track ID ${track.id}:`, error);
                return null; // 将错误的 track 标记为 null
              }
            }),
          );

          // 移除发生错误的 track
          const validTracks = tracksWithInfo
            .filter((result) => result.status === 'fulfilled' && result.value !== null)
            .map((result) => (result as PromiseFulfilledResult<TrackModel>).value);

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


  public async addPlaylist(playlistModel: PlaylistModel) {
    console.log('主进程: 添加歌单:', playlistModel);

    const track_collection: TrackModel[] = [];
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

  public async addTrackToPlaylist(playlistId: number, trackModel: TrackModel) {
    console.log(`正在添加歌曲到歌单，playlist_id: ${playlistId}, track:`, JSON.stringify(trackModel));

    try {
      const track = await this.trackRepository.findOrCreate(trackModel);
      await this.playlistDetailRepository.create({
        playlist_id: playlistId,
        track_id: track.id,
      });
      return track.id;
    } catch (error) {
      console.error('Error in add-track-to-playlistContext:', error);
      throw error;
    }
  }


  public async creatNewEmptyPlaylist() {
    return this.playlistRepository.create({
      cover_src: '',
      playlist_id: 0,
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


  // public async importPlaylistFromList(db: sqlite3.Database, playlistContext: any, store: any) {
  //
  //   // 从列表中提取歌曲信息
  //   const unbind_tracks = playlistContext.split('\n').map((line: any) => {
  //     const [title, artist] = line.split('-').map((s: any) => s.trim());
  //     return { title, artist };
  //   });
  //
  //   const length = unbind_tracks.length;
  //   const tracks: TrackModel[] = [];
  //   // 从 hifini 网站获取歌曲信息
  //   for (const [index, track] of unbind_tracks.entries()) {
  //     try {
  //       const searchResults = await this.hifiniMusicService.getSearchResults(`${track.title} ${track.artist}`, db, store);
  //       console.log(`正在处理第${index + 1}/${length}首歌曲: ${track.title} - ${track.artist}`);
  //
  //       if (searchResults.length > 0) {
  //         const firstResult = searchResults[0];
  //         tracks.push({
  //           data_href: firstResult.data_href,
  //           file_path: null,
  //         });
  //         console.log(`成功导入${track.title} - ${track.artist}`);
  //       } else {
  //         console.log(`未找到${track.title} - ${track.artist}`);
  //       }
  //     } catch (error) {
  //       console.error(`Error importing track: ${track.title} - ${track.artist}`, error);
  //       console.log(`导入${track.title} - ${track.artist}失败`);
  //     }
  //   }
  //
  //   // 插入歌曲到库
  //   for (const track of tracks) {
  //     try {
  //       const trackId: number = await this.trackService.addTrackToLibrary(track);
  //       console.log(`成功添加${track.title} - ${track.artist}到库，id: ${trackId}`);
  //     } catch (error) {
  //       console.log(`添加${track.title} - ${track.artist}到库失败`);
  //     }
  //   }
  //
  //
  // }


  public async modifyPlaylist(
    playlistModel: PlaylistModel,
  ) {
    console.log('主进程: 修改歌单信息:', playlistModel);
    await this.playlistRepository.update(playlistModel);
  }


  public async removeTrackFromPlaylist(
    playlistId: number
    , track: TrackModel,
  ) {
    return this.playlistDetailRepository.deleteByPlaylistIdAndTrackId(playlistId, track.id);
  }


  public async removePlaylist(playlistId: number) {
    return this.playlistRepository.delete(playlistId);
  }
}

