import axios from 'axios';
import { QQMusicTrackModel, TrackModel } from '@src/shared/types';
import { ContentProvider } from '../ContentProvider';
import { QQCloudSearchResponse, QQMusicTrackResponse } from '@main/contentProvider/QQMusic/Interfaces';
import { injectable } from 'inversify';

const base_url = 'http://47.97.185.179/qqmusicapi/';

@injectable()
export class QQMusic implements ContentProvider {
  /**
   * 根据关键词搜索 QQ 音乐免费歌曲，并返回统一的 TrackModel 数组
   * （原 cloudSearchQQ 方法逻辑重构而来）
   * @param keyword 搜索关键词
   */
  public async searchTracks(keyword: string): Promise<TrackModel[]> {
    const url = `${base_url}getSearchByKey?key=${encodeURIComponent(keyword)}`;
    const response = await axios.get(url);
    const data: QQCloudSearchResponse = response.data;
    const songs = data.response.data.song.list;

    // 根据业务规则：如果 pay.play 为 0 则认为是免费歌曲
    const freeSongs = songs.filter(song => this.isFree(song));

    console.log(`
QQ音乐搜索结果:
  总共返回: ${songs.length} 首
  免费歌曲: ${freeSongs.length} 首
${freeSongs.map((song) => `  - ${song.songname}（${song.albumname}）`).join('\n')}
    `);

    return freeSongs.map((song) => QQMusicTrackModel.buildFromResponse(song));
  }

  /**
   * 根据 QQ 音乐的唯一标识（songmid）获取播放链接
   * （原 getQQMusicLink 方法逻辑重构而来）
   * @param uniqueId QQ 音乐歌曲的唯一标识，即 songmid
   */
  public async getTrackLink(uniqueId: string): Promise<string> {
    const url = `${base_url}getMusicPlay?songmid=${uniqueId}`;
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
}

// 测试代码（可选）
// (async () => {
//   const qqMusic = new QQMusic();
//   const tracks = await qqMusic.searchTracks('银临');
//   console.log(tracks);
//   const trackLink = await qqMusic.getTrackLink('000A1xry3KwdhW');
//   console.log(trackLink);
// })();