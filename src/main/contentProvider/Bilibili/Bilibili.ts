import { inject, injectable } from 'inversify';
import { Platform } from '@main/core/enum/Platform';
import { ContentProvider } from '../ContentProvider';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { Lyric } from '@src/shared/domainModel/lyricLine';
import { BilibiliService, BiliVideoInfo } from '@main/contentProvider/Bilibili/BilibiliService';
import { DISymbol } from '@main/di/symbol';


@injectable()
export default class Bilibili implements ContentProvider {
  public readonly platformName = Platform.BILIBILI;
  public readonly serverNodes = ['https://api.bilibili.com'];

  constructor(
    @inject(DISymbol.BilibiliService) private bilibili: BilibiliService,
  ) {
  }

  /** 关键：只存 BV + 分P，播放时再解析直链 */
  private toTracksFromVideo(info: BiliVideoInfo): TrackEntity[] {
    return info.pages.map((p, idx) => ({
      platform: Platform.BILIBILI,
      platform_unique_id: `${info.bvid}?p=${idx + 1}`,
      title: p.part || `${info.title} (P${idx + 1})`,
      artist: info.owner?.name ?? 'UP主',
      album: 'Bilibili',
      duration: Number(p.duration ?? 0),
      cover_src: info.cover,
      created_at: new Date(),
      fee: 0,
    }));
  }

  private toTracksFromVideos(infos: BiliVideoInfo[]): TrackEntity[] {
    return infos.flatMap((v) => this.toTracksFromVideo(v));
  }

  /** 支持的 keyword：
   *  - 形如 BV... ：返回该视频全部分P。
   *  - bilibili 合集 URL（seriesdetail）：返回合集内所有视频的分P。
   *  - bilibili 合集 URL（collectiondetail）：返回收藏集全部视频分P。
   *  - 纯数字：按收藏夹 media_id 处理。
   *  其它情况可按需扩展为站内搜索。
   */
  async searchTracks(keyword: string, _filterPaid = false): Promise<TrackEntity[]> {
    const kw = (keyword || '').trim();

    // BV
    if (/^BV[0-9A-Za-z]+$/.test(kw)) {
      const v = await this.bilibili.getVideoInfo(kw);
      return this.toTracksFromVideo(v);
    }

    // // series/collection URL
    // const mSeries = kw.match(/\/(\d+)\/channel\/seriesdetail\?sid=(\d+)/);
    // if (mSeries) {
    //   const infos = await this.bili.getSeries(mSeries[1], mSeries[2]);
    //   return this.toTracksFromVideos(infos);
    // }
    //
    // const mCollection = kw.match(/\/(\d+)\/channel\/collectiondetail\?sid=(\d+)/);
    // if (mCollection) {
    //   const infos = await this.bili.getCollection(mCollection[1], mCollection[2]);
    //   return this.toTracksFromVideos(infos);
    // }
    //
    // // 数字：按收藏夹 media_id 处理
    // if (/^\d+$/.test(kw)) {
    //   const infos = await this.bili.getFavList(kw);
    //   return this.toTracksFromVideos(infos);
    // }

    // 可选：站内搜索（此处返回空以避免噪声）
    return [];
  }

  async getTrackLink(uniqueId: string): Promise<string | void> {
    const { bvid, p } = this.parseUniqueId(uniqueId);
    const info = await this.bilibili.getVideoInfo(bvid);
    const page = info.pages[(p - 1) | 0];
    if (!page) throw new Error(`No page ${p} for ${bvid}`);
    const play = await this.bilibili.getPlayUrl(bvid, page.cid);
    return play.audioUrl;
  }

  /** B站没有标准“歌词”，这里返回 void；你也可以在此处实现 QQ 歌词搜索并解析为 Lyric */
  async getLyrics(_uniqueId: string): Promise<Lyric | void> {
    return;
  }

  isFree(_song: any): boolean {
    // B站视频层面默认可免费试听；权限/会员/地域限制在实际拉流时体现（403 时你可选择重试 / 提示）
    return true;
  }

  /** 支持 "BV...?p=N"、"BV...:p=N"、"BV..._pN"，默认 p=1 */
  private parseUniqueId(uniqueId: string): { bvid: string; p: number } {
    const raw = uniqueId.trim();
    const mQ = raw.match(/^([a-zA-Z0-9]+)(?:\?p=(\d+))?$/);
    if (mQ) return { bvid: mQ[1], p: Number(mQ[2] ?? 1) || 1 };
    const mC = raw.match(/^([a-zA-Z0-9]+)[:_]?p(?:=)?(\d+)$/i);
    if (mC) return { bvid: mC[1], p: Number(mC[2]) || 1 };
    return { bvid: raw, p: 1 };
  }
}