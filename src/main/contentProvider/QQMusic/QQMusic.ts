import axios from 'axios';
import { ContentProvider } from '../ContentProvider';
import { QQCloudSearchResponse, QQMusicTrackResponse } from '@main/contentProvider/QQMusic/Interfaces';
import { injectable } from 'inversify';
import { QQMusicTrackModel, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { Platform } from '@main/enum/Platform';


@injectable()
export class QQMusic implements ContentProvider {

  public readonly platformName: Platform;
  public readonly serverNodes: string[];
  private readonly base_url: string;

  constructor() {
    this.platformName = Platform.QQ_MUSIC;
    this.serverNodes = ['http://47.97.185.179/qqmusicapi/'];
    this.base_url = this.serverNodes[0];
  }


  /**
   * 根据关键词搜索 QQ 音乐免费歌曲，并返回统一的 TrackRecord 数组
   * （原 cloudSearchQQ 方法逻辑重构而来）
   * @param keyword 搜索关键词
   * @param filterPaid 是否过滤付费歌曲（默认值 true）
   */
  public async searchTracks(
    keyword: string,
    filterPaid: boolean = true,
  ): Promise<TrackEntity[]> {
    // 构造请求 URL
    const url = `${this.base_url}getSearchByKey?key=${encodeURIComponent(keyword)}`;

    // 发起请求
    const response = await axios.get<QQCloudSearchResponse>(url);
    const songs = response.data.response.data.song.list;

    // 根据 filterPaid 决定是否过滤付费歌曲
    const resultSongs = filterPaid ? songs.filter(song => this.isFree(song)) : songs;

    // 打印日志
    console.log(`
QQ音乐搜索结果:
  返回总数: ${songs.length} 首
  ${filterPaid ? '免费歌曲' : '所有歌曲'}: ${resultSongs.length} 首
${resultSongs
      .map(song => `  - ${song.songname}（${song.albumname}）`)
      .join('\n')}
  `);

    // 构造并返回 TrackRecord 列表
    return resultSongs.map(song =>
      QQMusicTrackModel.buildFromResponse(song),
    );
  }

  /**
   * 根据 QQ 音乐的唯一标识（songmid）获取播放链接
   * （原 getQQMusicLink 方法逻辑重构而来）
   * @param uniqueId QQ 音乐歌曲的唯一标识，即 songmid
   */
  public async getTrackLink(uniqueId: string): Promise<string> {
    const url = `${this.base_url}getMusicPlay?songmid=${uniqueId}`;
    const response = await axios.get(url);
    const data: QQMusicTrackResponse = response.data;
    console.dir(data, { depth: null });
    return data.data.playUrl[uniqueId].url || '';
  }

  /**
   * 判断歌曲是否可以免费播放
   * @param song 歌曲数据
   */
  isFree(song: any): boolean {
    return song.pay.payplay === 0;
  }

  public async getLyrics(uniqueId: string): Promise<Lyric | void> {
    const url = `${this.base_url}getLyric?songmid=${uniqueId}`;
    try {
      const response = await axios.get(url);
      const data = response.data;
      if (data.code !== 0) {
        console.error('无效的歌词数据');
      }
      return this.parseLyrics(data.response.lyric);
    } catch (error) {
      console.error('获取歌词失败:', error);
      throw error;
    }
  }

  /**
   * 根据传入的歌词字符串解析出歌词对象。
   * 这里每行歌词格式为: [mm:ss.xx]歌词文本
   * 例如: [00:13.91]忘掉种过的花 重新的出发 放弃理想吧
   */
  private parseLyrics(lyricString: string): Lyric {
    const lines: LyricLine[] = [];
    // 匹配时间标签和后面的歌词文本，格式：[mm:ss.xx]文本
    const regex = /^\[(\d{2}):(\d{2}(?:\.\d{2})?)\](.*)$/;

    // 将传入的歌词字符串按行分割
    const lyricLines = lyricString.split('\n');
    for (const line of lyricLines) {
      const match = regex.exec(line);
      if (match) {
        // 提取分钟、秒钟和文本内容
        const minutes = parseInt(match[1], 10);
        const seconds = parseFloat(match[2]);
        const text = match[3].trim();
        // 将分钟和秒钟转换为毫秒时间
        const time = minutes * 60 * 1000 + seconds * 1000;
        lines.push({ time, text });
      }
    }
    return { lines };
  }
}

// 测试代码（可选）
// (async () => {
//   const qqMusic = new QQMusic();
//   const tracks = await qqMusic.searchTracks('银临');
//   console.log(tracks);
//   const trackLink = await qqMusic.getTrackLink('000A1xry3KwdhW');
//   console.log(trackLink);
// })();