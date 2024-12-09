import { inject } from 'inversify';
import { PlaylistModel, TrackModel } from '@src/shared/types';
import PlaylistRepository from '@main/repository/PlaylistRepository';
import TrackRepository from '@main/repository/TrackRepository';
import PlaylistDetailRepository from '@main/repository/PlaylistDetailRepository';
import { fileExists } from '@src/utils/helpers';
import { PlaylistDetail } from '@main/models';
import TrackService from '@main/services/TrackService';
import HifiniMusicService from '@main/services/HifiniMusicService';
import ElectronStore from 'electron-store';


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
        if (track.platform === 'Local') {
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
        const playlistTracks = await this.trackService.findTracksByPlaylistId(playlist.playlist_id);
        // 过滤不存在的歌曲
        playlist.tracks = playlistTracks;
        console.log(`歌单: ${playlist.title} 获取到有效歌曲数量: ${playlist.tracks.length}`);
      }

      // Step 4: 添加音乐库歌单
      playlists.push(
        {
          playlist_id: 0,
          title: '音乐库',
          created_at: new Date(),
          tracks: validTracks,
          creator: '系统',
          description: '所有库中的音乐文件',
          modified_at: new Date(),
        },
      );

      console.log(`共获取到歌单数量: ${playlists.length}`);
      console.log('歌单信息:', playlists);

      // Step 5: 获取每首歌曲的详细信息
      const enrichedPlaylists = await Promise.all(
        playlists.map(async (playlist: PlaylistModel) => {
          const tracksWithInfo = await Promise.allSettled(
            playlist.tracks.map(async (track) => {
              try {
                const trackInfo = await this.trackService.getTrackInfo(track.id);
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

      return enrichedPlaylists;

    } catch (err) {
      // 错误处理：捕获并记录所有错误
      console.error('从数据库读取歌单时出错:', err);
      return [];
    }
  }


  public async addTrackToPlaylist(
    playlistId: number
    , trackId: number,
  ) {

    //参数检查
    if (!playlistId || !trackId) {
      throw new Error('playlistId 和 trackId 不能为空');
    }


    await this.playlistDetailRepository.create(new PlaylistDetail({
      playlist_id: playlistId,
      track_id: trackId,
    }));

  }


  public async creatNewEmptyPlaylist() {
    return this.playlistRepository.create({
      playlist_id: 0,
      tracks: [],
      title: '新建歌单',
      description: '',
      creator: '系统',
      created_at: new Date(),
      modified_at: new Date(),
    });
  }


  // public async importPlaylistFromList(db: sqlite3.Database, playlist: any, store: any) {
  //
  //   // 从列表中提取歌曲信息
  //   const unbind_tracks = playlist.split('\n').map((line: any) => {
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

