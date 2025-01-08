import { inject } from 'inversify';
import TrackRepository from '@main/repository/TrackRepository';

import { IAudioMetadata, parseFile } from 'music-metadata';
import HifiniMusicService from '@main/services/HifiniMusicService';
import { TrackModel } from '@src/shared/types';
import PlaylistDetailRepository from '@main/repository/PlaylistDetailRepository';
import { Platform } from '@main/enum/Platform';

export default class TrackService {

  constructor(
    @inject('TrackRepository') private trackRepository: TrackRepository,
    @inject('HifiniMusicService') private hifiniMusicService: HifiniMusicService,
    @inject('PlaylistDetailRepository') private playlistDetailRepository: PlaylistDetailRepository,
  ) {
  }

  // 获取音乐文件的元数据
  public async extractMusicMeta(file_path: string) {
    try {
      return await parseFile(file_path);
    } catch (error) {
      console.error('Error reading metadata:', error);
      throw error;
    }
  }

  public parseTrackInfo(metadata: IAudioMetadata) {
    // 提取封面图片并转为Base64
    let coverBase64 = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0]; // 通常封面是第一个图片
      const buffer = Buffer.from(picture.data);

      coverBase64 = `data:${picture.format};base64,${buffer.toString('base64')}`;
    }
    // 构建目标JSON对象
    return {
      cover_src: coverBase64,
      title: metadata.common.title || 'Unknown Title',
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      duration: metadata.format.duration || 0,
    };
  }


  public async getTrackInfo(
    platform: Platform,
    platform_unique_id: string,
  ): Promise<TrackModel> {

    // only file_path or data_href is provided
    const trackModel = await this.trackRepository.findByPlatformAndPlatformUniqueId(platform, platform_unique_id);
    // console.log('trackModel:', trackModel);

    switch (trackModel.platform) {
      case  Platform.LOCAL: {
        // 如果是本地文件,提取元数据
        const metaData = await this.extractMusicMeta(trackModel.platform_unique_id);
        const parse_result = this.parseTrackInfo(metaData);
        return Object.assign(trackModel, parse_result);

      }
      case Platform.NET_EASE_CLOUD_MUSIC: {
        break;
      }
      case Platform.HIFINI: {
        const metaData = await this.hifiniMusicService.getMusicInfo(trackModel.platform_unique_id);
        return Object.assign(trackModel, metaData);

      }

    }


  }


  public async addTrackToLibrary(track: TrackModel): Promise<TrackModel> {

    const platform: string = track.platform;
    const platform_unique_id: string = track.platform_unique_id;

    const track1: TrackModel = await this.trackRepository.findByPlatformAndPlatformUniqueId(platform, platform_unique_id);

    if (track1) {
      console.log('待添加的音乐已在库中，id:', track1.id);
      return track1;
    }

    return await this.trackRepository.create(track);

  }


  public async addTrackToPlaylist(playlistId: number, track: TrackModel) {
    console.log(`正在添加歌曲到歌单，playlist_id: ${playlistId}, track:`, JSON.stringify(track));
    let trackId: number;

    try {
      // 先检查歌曲是否在库中
      const track1: TrackModel = await this.trackRepository.findByPlatformAndPlatformUniqueId(track.platform, track.platform_unique_id);

      if (!track1) {
        // 如果不在库中，先添加到库
        track = await this.trackRepository.create(track);
        console.log(`待插入歌单歌曲不在库中，已添加到库，track_id: ${track.getIdentifier()}`);
        trackId = track.id;

      } else {
        trackId = track1.id;
        console.log(`待插入歌单的歌曲已在库中，track_id: ${trackId}`);
      }

      await this.playlistDetailRepository.create({
        playlist_id: playlistId,
        track_id: trackId,
      });

      return trackId;
    } catch (error) {
      console.error('Error in add-track-to-playlist:', error);
      throw error;
    }
  }


  public async findTracksByPlaylistId(playlistId: number): Promise<TrackModel[]> {

    const trackIds = await this.playlistDetailRepository.findTrackIdsByPlaylistId(playlistId);

    return await Promise.all(
      trackIds.map(async (trackId) => {
        return await this.trackRepository.findById(trackId);
      }),
    );


  }


  public async removeTrackFromLibrary(track: TrackModel): Promise<number> {
    return await this.trackRepository.delete(track.id);
  }


}