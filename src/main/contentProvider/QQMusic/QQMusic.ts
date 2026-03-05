import axios from 'axios';
import { AbstractContentProvider } from '../AbstractContentProvider';
import { QQCloudSearchResponse, QQMusicTrackResponse } from '@main/contentProvider/QQMusic/QQMusicInterfaces';
import { inject, injectable } from 'inversify';
import { QQMusicTrackModel, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { Platform } from '@main/core/enum/Platform';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { DISymbol } from '@main/di/symbol';
import { Logger } from 'winston';


@injectable()
export class QQMusic extends AbstractContentProvider {

  public readonly platformName: Platform;
  public readonly serverNodes: string[];
  public readonly isCensored = true;
  private readonly base_url: string;

  constructor(
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
    this.platformName = Platform.QQ_MUSIC;
    this.serverNodes = ['https://qq-music-kqeb3r5a8-tinkeracs-projects.vercel.app/'];
    this.base_url = this.serverNodes[0];
  }


  /**
   * 根据关键词搜索 QQ 音乐免费歌曲，并返回统一的 TrackRecord 数组
   * @param keyword 搜索关键词
   * @param filterPaid 是否过滤付费歌曲（默认值 true）
   */
  public async searchTrack(
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
    this.logger.info(`
QQ音乐搜索结果:
  返回总数: ${songs.length} 首
  ${filterPaid ? '免费歌曲' : '所有歌曲'}: ${resultSongs.length} 首
${resultSongs
      .map(song => `  - ${song.songname}（${song.albumname}）-uid: ${song.songmid}`)
      .join('\n')}
  `);

    // 构造并返回 TrackRecord 列表
    return resultSongs.map(song =>
      QQMusicTrackModel.buildFromResponse(song),
    );
  }

  /**
   * 根据关键词搜索 QQ 音乐的歌曲和歌单
   * @param keyword
   * @param filterPaid
   */
  public async search(
    keyword: string,
    filterPaid: boolean = true,
  ): Promise<FusionSearchResult> {
    const tracks = await this.searchTrack(keyword, filterPaid);
    return {
      track_result: tracks,
      playlist_result: [],
    };
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
    this.logger.info(`QQ音乐歌曲链接详情:`, data);
    return data.data.playUrl[uniqueId].url || '';
  }

  /**
   * 判断歌曲是否可以免费播放
   * @param song 歌曲数据
   */
  isFree(song: any): boolean {
    return song.pay.payplay === 0;
  }

  public async getLyrics(uniqueId: string): Promise<Lyric> {
    const url = `${this.base_url}getLyric?songmid=${uniqueId}`;
    this.logger.debug('url:', url);
    try {

      const response = await axios.get(url);

      const data = await response?.data ?? {};
      const payload = data?.response ?? data;

      const rawOrigin: string = payload?.lyric ?? '';
      const rawTrans: string = payload?.trans ?? '';

      // 一些 QQ 接口会返回 base64 编码的歌词；若检测不到 LRC 标记，则尝试解码
      const decodeIfNeeded = (s: string): string => {
        if (typeof s !== 'string') return '';
        const hasLRC = s.includes('[') && s.includes(']');
        if (hasLRC) return s;
        try {
          return Buffer.from(s, 'base64').toString('utf8');
        } catch {
          return s;
        }
      };

      const origin = decodeIfNeeded(rawOrigin);
      const translation = decodeIfNeeded(rawTrans);

      return this.parseLyrics(origin, translation);
    } catch (error) {
      this.logger.error('获取歌词失败:', error);
      //反回空歌词
      return new Lyric();
    }
  }

  /**
   * 根据传入的歌词字符串解析出歌词对象。
   * 这里每行歌词格式为: [mm:ss.xx]歌词文本
   * 例如: [00:13.91]忘掉种过的花 重新的出发 放弃理想吧
   */
  private parseLyrics(originRaw: string, translationRaw?: string): Lyric {
    const normalize = (s?: string) => (typeof s === 'string' ? s.replace(/\r\n?|\n/g, '\n') : '');
    const origin = normalize(originRaw);
    const trans = normalize(translationRaw);

    const parseSegment = (raw: string): LyricLine[] => {
      if (!raw.trim()) return [];
      const regex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?](.*)$/;
      const out: LyricLine[] = [];
      for (const row of raw.split('\n')) {
        const trimmed = row.trim();
        if (!trimmed) continue;
        const m = trimmed.match(regex);
        if (!m) continue;
        const [, mm, ss, ms = '0', textRaw] = m;
        const t = parseInt(mm, 10) * 60_000 + parseInt(ss, 10) * 1_000 + parseInt(ms.padEnd(3, '0'), 10);
        out.push({ time: t, text: (textRaw ?? '').trim() });
      }
      return out.sort((a, b) => a.time - b.time).reduce<LyricLine[]>((acc, cur) => {
        const last = acc.at(-1);
        if (last && last.time === cur.time) last.text += ` / ${cur.text}`; else acc.push(cur);
        return acc;
      }, []);
    };

    return new Lyric(parseSegment(origin), parseSegment(trans), []);
  }
}

// 测试代码（可选）
// (async () => {
//   const qqMusic = new QQMusic();
//   const track_result = await qqMusic.searchTrack('银临');
//   this.logger.info(track_result);
//   const trackLink = await qqMusic.getTrackLink('000A1xry3KwdhW');
//   this.logger.info(trackLink);
// })();
