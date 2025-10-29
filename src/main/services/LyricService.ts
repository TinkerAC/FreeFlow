import { inject, injectable } from 'inversify';
import { AbstractContentProvider } from '@main/contentProvider/AbstractContentProvider';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';

import { DISymbol } from '@main/di/symbol';
import YouTubeMusic from '@main/contentProvider/YouTubeMusic/YouTubeMusic';
import { ProviderManager } from '@main/core/ProviderManager';
import { Logger } from 'winston';

/**
 * 根据传入 TrackRecord 获取歌词数据
 * @param track_model 歌曲模型
 * @returns Promise<Lyric>
 *
 * 注意：本函数中不在内部捕获异常，而是将异常向上传递，
 *
 */
@injectable()
export class LyricService {

  constructor(
    @inject(DISymbol.NetEaseCloudMusic) private netEaseMusic: AbstractContentProvider,
    @inject(DISymbol.QQMusic) private qqMusic: AbstractContentProvider,
    @inject(DISymbol.YouTubeMusic) private youtubeMusic: YouTubeMusic,
    @inject(DISymbol.ProviderManager) private providerManager: ProviderManager,
    @inject(DISymbol.Logger) private logger: Logger,
  ) {
  }

  async getLyrics(track_model: TrackEntity): Promise<Lyric | void> {
    const { platform, platform_unique_id } = track_model;
    this.logger.info('加载歌词请求:', platform, platform_unique_id);

    if (!platform || !platform_unique_id) {
      throw new Error('无效的歌曲标识符: 缺少 platform_unique_id 字段');
    }

    // 统一移交给 ProviderManager，内部自动选择/兜底
    return await this.providerManager.getLyricsForTrack(track_model);
  }
}



