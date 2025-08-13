import { inject, injectable } from 'inversify';
import { Platform } from '@main/core/enum/Platform';
import { ContentProvider } from '../ContentProvider';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { Lyric } from '@src/shared/domainModel/lyricLine';

import { DISymbol } from '@main/di/symbol';
import { BilibiliService } from '@main/contentProvider/Bilibili/BilibiliService';
import { BiliVideoInfo } from '@main/contentProvider/Bilibili/BilibiliInterfaces';

/* ──────────────── 工具：提取/规范化 ──────────────── */

/** 从任意字符串中提取 BV 号（支持完整 URL 或裸 BV） */
function extractBV(input: string): string | null {
  if (!input) return null;
  const s = input.trim();

  // https://www.bilibili.com/video/BVxxxx... （?p=2 可有可无）
  const inUrl = s.match(/bilibili\.com\/video\/(BV[0-9A-Za-z]{10,})/i)?.[1];
  if (inUrl) return inUrl;

  // 裸 BV：BV 开头，通常长度 ≥ 12
  const naked = s.match(/(BV[0-9A-Za-z]{10,})/)?.[1];
  if (naked) return naked;

  return null;
}

/** 解析 uniqueId 支持：
 *  - 'BVxxx?p=2' / 'BVxxx#p=2'
 *  - 'BVxxx:p=2' / 'BVxxx_p2' / 'BVxxx:p2'
 *  - 完整 URL（含 ?p=2 / #p=2）
 *  缺省 p=1
 */
function parseUniqueIdFlexible(uniqueId: string): { bvid: string; p: number } {
  const raw = (uniqueId || '').trim();
  const bvid = extractBV(raw) || raw;

  // ?p=2 或 #p=2
  const qp = raw.match(/[?#&]p=(\d+)/i)?.[1];
  if (qp) return { bvid, p: Math.max(1, parseInt(qp, 10) || 1) };

  // :p=2 / _p2 / :p2
  const alt = raw.match(/[:_]?p[=]?(\d+)/i)?.[1];
  if (alt) return { bvid, p: Math.max(1, parseInt(alt, 10) || 1) };

  return { bvid, p: 1 };
}

/** 把 http → https，避免渲染层的混合内容被拦截 */
function httpsify(u?: string): string {
  return u ? u.replace(/^http:\/\//i, 'https://') : '';
}

@injectable()
export default class Bilibili implements ContentProvider {
  public readonly platformName = Platform.BILIBILI;
  public readonly serverNodes = ['https://api.bilibili.com'];

  constructor(@inject(DISymbol.BilibiliService) private bilibili: BilibiliService) {
  }

  /**
   * 组装 Track：
   * - 单 P：title = 视频主标题
   * - 多 P：title = “主标题 · 分P名”（分 P 名缺失就 “主标题 · P{idx}”）
   * - album = 主标题（更贴近 Apple Music 的组织）
   * - artist = UP 主名
   */
  private toTracksFromVideo(info: BiliVideoInfo): TrackEntity[] {
    const pages = Array.isArray(info.pages) ? info.pages : [];
    const isMultiP = pages.length > 1;

    const albumTitle = (info.title || 'Bilibili').trim();
    const artist = (info.owner?.name || 'UP主').trim();
    const cover = httpsify(info.cover);

    return pages.map((p, idx) => {
      const part = (p?.part || '').trim();
      let title: string;

      if (!isMultiP) {
        // 单 P：直接用主标题（你之前看到的 “上山岗_Mux” 就是这里的修复点）
        title = albumTitle;
      } else {
        // 多 P：主标题 + 分 P 信息（尽量优雅）
        const suffix = part || `P${idx + 1}`;
        title = `${albumTitle} · ${suffix}`;
      }

      return {
        platform: Platform.BILIBILI,
        platform_unique_id: `${info.bvid}?p=${idx + 1}`,
        title,
        artist,
        album: albumTitle,
        duration: Number.isFinite(p?.duration) ? Number(p.duration) : 0,
        cover_src: cover,
        created_at: new Date(),
        fee: 0,
      };
    });
  }

  private toTracksFromVideos(infos?: BiliVideoInfo[] | null): TrackEntity[] {
    if (!Array.isArray(infos) || !infos.length) return [];
    return infos.flatMap((v) => this.toTracksFromVideo(v));
  }

  /**
   * 关键词解析（**宽松**）：
   * - 任意字符串里包含 “BV……”：按视频视为命中
   * - series/collection URL：解析合集
   * - media_id=12345 或 纯数字（≥5 位）：按收藏夹
   * - 其他情况（站内搜索）暂不返回，避免噪声
   *
   * 注意：不要把关键字拼回 Track（如加到 title/artist 上），避免污染其他平台的数据。
   */
  async searchTracks(keyword: string, _filterPaid = false): Promise<TrackEntity[]> {
    const kw = (keyword || '').trim();
    if (!kw) return [];

    // BV 命中（来自任意字符串）
    const bvid = extractBV(kw);
    if (bvid) {
      const v = await this.bilibili.getVideoInfo(bvid);
      const tracks = this.toTracksFromVideo(v);
      console.dir({ tag: '[bili:searchTracks]', bvid, pages: v.pages?.length ?? 0, out: tracks.length }, {
        colors: true,
        depth: 2,
      });
      return tracks;
    }

    // series（合集）
    const mSeries = kw.match(/\/(\d+)\/channel\/seriesdetail\?sid=(\d+)/);
    if (mSeries) {
      const infos = await this.bilibili.getSeries(mSeries[1], mSeries[2]);
      return this.toTracksFromVideos(infos);
    }

    // collection（收藏集）
    const mCollection = kw.match(/\/(\d+)\/channel\/collectiondetail\?sid=(\d+)/);
    if (mCollection) {
      const infos = await this.bilibili.getCollection(mCollection[1], mCollection[2]);
      return this.toTracksFromVideos(infos);
    }

    // 收藏夹 media_id：纯数字（≥5 位）或出现 media_id=xxxx
    const favId = kw.match(/media_id=(\d{5,})/)?.[1] || (/^\d{5,}$/.test(kw) ? kw : '');
    if (favId) {
      const infos = await this.bilibili.getFavList(favId);
      return this.toTracksFromVideos(infos);
    }

    return [];
  }

  async getTrackLink(uniqueId: string): Promise<string | void> {
    const { bvid, p } = parseUniqueIdFlexible(uniqueId);
    const info = await this.bilibili.getVideoInfo(bvid);
    const pages = Array.isArray(info.pages) ? info.pages : [];
    const page = pages[(p - 1) | 0];
    if (!page) throw new Error(`No page ${p} for ${bvid}`);
    const play = await this.bilibili.getPlayUrl(bvid, page.cid);
    // 统一 https
    return play.audioUrl.replace(/^http:\/\//i, 'https://');
  }

  /** B 站没有标准歌词接口，这里保持 void。需要也可以接入第三方歌词源。 */
  async getLyrics(_uniqueId: string): Promise<Lyric | void> {
    return;
  }

  isFree(): boolean {
    // B 站默认可试听；（会员/地区/版权）在拉流时体现，届时按错误策略处理
    return true;
  }
}