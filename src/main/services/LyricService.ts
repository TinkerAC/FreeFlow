import { inject, injectable } from 'inversify';
import { ContentProvider } from '@main/contentProvider/ContentProvider';
import { Platform } from '@main/enum/Platform';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';

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
    @inject('NetEaseCloudMusic') private netEaseMusic: ContentProvider,
    @inject('QQMusic') private qqMusic: ContentProvider,
  ) {
  }

  async getLyrics(track_model: TrackEntity): Promise<Lyric | void> {
    const { platform, platform_unique_id } = track_model;
    console.log('后台收到加载歌词请求:', platform, platform_unique_id);

    if (!platform || !platform_unique_id) {
      throw new Error('无效的歌曲标识符: 缺少 platform_unique_id 字段');
    }

    switch (platform) {
      case Platform.NET_EASE_CLOUD_MUSIC: {
        console.log('正在获取网易云歌词');
        return await this.netEaseMusic.getLyrics(platform_unique_id);
      }
      case Platform.QQ_MUSIC: {
        console.log('正在获取QQ音乐歌词');
        return await this.qqMusic.getLyrics(platform_unique_id);
      }
      default: {
        console.log('正在获取其他平台歌词');
        // 其他情况：先同时搜索各平台，再获取歌词
        const searchKeyword = `${track_model.title} ${track_model.artist}`;
        // 使用 Promise.all 并发请求 NetEase 和 QQ 的搜索接口
        const [netease_response, qq_response] = await Promise.all([
          this.netEaseMusic.searchTracks(searchKeyword, false),
          this.qqMusic.searchTracks(searchKeyword, false),
        ]);

        // 分别获取搜索结果中的第一首歌曲（如果存在）
        const qq_first_song: TrackEntity = qq_response && qq_response[0];
        const netease_first_song: TrackEntity = netease_response && netease_response[0];

        // 优先使用网易云的歌曲
        if (netease_first_song) {
          return await this.netEaseMusic.getLyrics(netease_first_song.platform_unique_id);
        } else if (qq_first_song) {
          return await this.qqMusic.getLyrics(qq_first_song.platform_unique_id);
        } else {
          throw new Error('未找到相关歌曲的信息');
        }
      }
    }
  }
}







