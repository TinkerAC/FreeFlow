import { inject, injectable } from 'inversify';
import TrackRepository from '@main/database/repository/TrackRepository';

import { IAudioMetadata, parseFile } from 'music-metadata';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import { Platform } from '@main/core/enum/Platform';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';
import PlaylistRepository from '@main/database/repository/PlaylistRepository';
import { DISymbol } from '@main/di/symbol';
import type { AiTextService } from '@main/services/ai/AiTextService';
import { Logger } from 'winston';
import { AbstractService } from '@main/services/AbstractService';


@injectable()
export default class TrackService extends AbstractService {
  constructor(
    @inject(DISymbol.TrackRepository) private trackRepository: TrackRepository,
    @inject(DISymbol.HifiniMusic) private hifiniMusic: HifiniMusic,
    @inject(DISymbol.PlaylistRepository) private playlistRepository: PlaylistRepository,
    @inject(DISymbol.AiTextService) private aiText: AiTextService,
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
  }

  // 获取音乐文件的元数据
  public async extractMusicMeta(file_path: string) {
    try {
      return await parseFile(file_path);
    } catch (error) {
      this.logger.error('Error reading metadata:', error);
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
  ): Promise<TrackEntity> {

    // only file_path or data_href is provided
    const trackModel = await this.trackRepository.findByPlatformAndPlatformUniqueId(platform, platform_unique_id);
    if (!trackModel) {
      throw new Error(`Track not found: ${platform}:${platform_unique_id}`);
    }
    // this.logger.log('trackModel:', trackModel);

    switch (trackModel.platform) {
      case  Platform.LOCAL: {
        // 如果是本地文件,提取元数据
        const metaData = await this.extractMusicMeta(trackModel.platform_unique_id);
        const parse_result = this.parseTrackInfo(metaData);
        return Object.assign(trackModel, parse_result);

      }
      case Platform.NET_EASE_CLOUD_MUSIC: {
        return trackModel;
      }
      case Platform.HIFINI: {
        const metaData: HifiniThreadCacheModel = await this.hifiniMusic.getMusicInfo(trackModel.platform_unique_id);
        return Object.assign(trackModel, metaData);
      }

      case Platform.QQ_MUSIC: {
        return trackModel;
      }
      case Platform.FREEFLOW: {
        return trackModel;
      }
      default: {
        return trackModel;
      }

    }


  }


  public async addTrackToLibrary(track: TrackEntity): Promise<TrackEntity> {
    if (track.platform === Platform.FREEFLOW) {
      throw new Error('FreeFlow 资源需要购买或确认拥有后加入链上音乐库');
    }

    const platform: string = track.platform;
    const platform_unique_id: string = track.platform_unique_id;

    const track1: TrackEntity = await this.trackRepository.findByPlatformAndPlatformUniqueId(platform, platform_unique_id);

    if (track1) {
      this.logger.log('待添加的音乐已在库中，id:', track1.id);
      return track1;
    }

    // 在写库前调用 AI 清洗标题/歌手（仅在启用且可用时生效，失败则忽略）
    try {
      const cleaned = await this.aiText.cleanTitleArtist(track.title ?? '', track.artist ?? '');
      if (cleaned?.title) track.title = cleaned.title;
      if (typeof cleaned?.artist === 'string') track.artist = cleaned.artist;
    } catch {
      // ignore
    }

    return await this.trackRepository.create(track);

  }


  public async findTracksByPlaylistId(playlistId: number): Promise<TrackEntity[]> {

    const tracks = await this.playlistRepository.findTracksByPlaylistId(playlistId);

    if (!tracks || tracks.length === 0) {
      return [];
    }

    const trackIds = tracks.map((track) => track.id);


    return await Promise.all(
      trackIds.map(async (trackId) => {
        return await this.trackRepository.findById(trackId);
      }),
    );

  }


  public async removeTrackFromLibrary(track: TrackEntity): Promise<number> {
    return await this.trackRepository.delete(track.id);
  }

  //用于将下载后的本地文件绑定到数据库中的曲目
  public async bindLocalTrackFile(trackId: number, filePath: string): Promise<TrackEntity> {
    return await this.trackRepository.bindLocalFileToTrack(trackId, filePath);
  }

  public async getChainLibraryTracks(): Promise<TrackEntity[]> {
    const tracks = await this.trackRepository.findAll();
    return tracks.filter((track) => track.platform === Platform.FREEFLOW);
  }

  public async upsertChainLibraryTrack(track: TrackEntity): Promise<TrackEntity> {
    if (track.platform !== Platform.FREEFLOW) {
      throw new Error('链上音乐库只接受 FreeFlow 资源');
    }
    if (!track.platform_unique_id) {
      throw new Error('链上资源缺少 resourceKey');
    }

    const current = await this.trackRepository.findByPlatformAndPlatformUniqueId(
      track.platform,
      track.platform_unique_id,
    );

    if (!current) {
      return await this.trackRepository.create(track);
    }

    return await this.trackRepository.update({
      ...current,
      ...track,
      id: current.id,
      downloaded: current.downloaded,
      download_status: current.download_status,
      download_source_cid: current.download_source_cid,
      download_source_gateway: current.download_source_gateway,
      download_error: current.download_error,
      downloaded_at: current.downloaded_at,
    } as TrackEntity);
  }

  public async removeChainLibraryTrack(track: TrackEntity): Promise<number> {
    if (track.id) {
      return await this.trackRepository.delete(track.id);
    }

    const current = await this.trackRepository.findByPlatformAndPlatformUniqueId(
      track.platform,
      track.platform_unique_id,
    );
    return current?.id ? await this.trackRepository.delete(current.id) : 0;
  }

  public async markDownloadState(trackId: number, state: {
    status: 'none' | 'downloading' | 'downloaded' | 'failed';
    localPath?: string;
    sourceCid?: string;
    sourceGateway?: string;
    error?: string;
    downloadedAt?: Date | null;
  }): Promise<TrackEntity> {
    return await this.trackRepository.updateDownloadState(trackId, state);
  }


  public async increasePlayCount(track: TrackEntity): Promise<TrackEntity> {
    return await this.trackRepository.increasePlayCount(track);
  }

  public async localSearch(term: string, limit: number = 20): Promise<TrackEntity[]> {
    return await this.trackRepository.localSearch(term, limit);
  }

  /** 更新曲目的基础元信息（title/artist/album）。返回更新后的实体。*/
  public async updateBasicInfo(payload: {
    platform: string;
    platform_unique_id: string;
    title?: string;
    artist?: string;
    album?: string
  }): Promise<TrackEntity> {
    const prev = await this.trackRepository.findByPlatformAndPlatformUniqueId(payload.platform, payload.platform_unique_id);
    if (!prev) throw new Error(`Track not found: ${payload.platform}:${payload.platform_unique_id}`);
    const next: TrackEntity = { ...prev } as TrackEntity;
    if (typeof payload.title === 'string') next.title = payload.title;
    if (typeof payload.artist === 'string') next.artist = payload.artist;
    if (typeof payload.album === 'string') next.album = payload.album;
    next.modified_at = new Date();
    return await this.trackRepository.update(next);
  }

}
