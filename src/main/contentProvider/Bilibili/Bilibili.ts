import { inject, injectable } from 'inversify';
import { Platform } from '@main/core/enum/Platform';
import { ContentProvider } from '../ContentProvider';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { Lyric } from '@src/shared/domainModel/lyricLine';
import { BilibiliService, BiliSearchVideoItem, BiliVideoInfo } from '@main/contentProvider/Bilibili/BilibiliService';
import { DISymbol } from '@main/di/symbol';
import chalk from 'chalk';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

@injectable()
export default class Bilibili implements ContentProvider {
  public readonly platformName = Platform.BILIBILI;
  public readonly serverNodes = ['https://api.bilibili.com'];

  constructor(@inject(DISymbol.BilibiliService) private bilibili: BilibiliService) {
  }

  /** 只存 BV + 分P，播放时再解析直链 */
  private toTracksFromVideo(info: BiliVideoInfo): TrackEntity[] {
    const cover = info.cover;
    const artist = info.owner?.name ?? 'UP主';
    return (info.pages ?? []).map((p, idx) => ({
      platform: Platform.BILIBILI,
      platform_unique_id: `${info.bvid}?p=${idx + 1}`,
      title: info.pages.length === 1 ? info.title : p?.part || `${info.title}(P${idx + 1})}`,
      artist,
      album: 'Bilibili',
      duration: Number(p?.duration ?? 0),
      cover_src: cover,
      created_at: new Date(),
      fee: 0,
    }));
  }

  private toTracksFromVideos(infos: BiliVideoInfo[]): TrackEntity[] {
    return infos.flatMap((v) => this.toTracksFromVideo(v));
  }

  /** 搜索结果（关键字）→ 先给每个视频一条 Track（默认 P1），轻量快速 */
  private toTracksFromSearch(items: BiliSearchVideoItem[]): TrackEntity[] {
    return items.map((it) => ({
      platform: Platform.BILIBILI,
      platform_unique_id: `${it.bvid}?p=1`,
      title: it.title || it.bvid,
      artist: it.author || 'UP主',
      album: 'Bilibili',
      duration: Number(it.duration || 0),
      cover_src: it.cover,
      created_at: new Date(),
      fee: 0,
    }));
  }

  /** 支持：
   *  - 文本里“包含” BVxxx → 拉该视频全部分 P
   *  - series/collection/fav（保留原注释的模式，后续需要可解开）
   *  - 其它：走关键字搜索（WBI），返回视频列表（每个视频先用 P1）
   */
  async searchTracks(keyword: string): Promise<TrackEntity[]> {
    try {
      const kw = (keyword || '').trim();
      if (!kw) return [];

      // 任何位置匹配 BV（更宽松）：例如 “xxx BV1xxabc yyy”
      const BVID = kw.match(/BV[0-9A-Za-z]+/i);
      if (BVID?.[0]) {
        try {
          const videoInfo = await this.bilibili.getVideoInfo(BVID[0]);
          const tracks = this.toTracksFromVideo(videoInfo);
          console.log(chalk.rgb(102, 204, 255)(`[Bilibili BV] ${BVID[0]} -> ${tracks.length} track(s)`));
          return tracks;
        } catch (e) {
          console.warn('[bilibili.searchTracks] getVideoInfo failed for', BVID[0], e);
          // 不中断，继续尝试关键字搜索
        }
      }
    } catch (e) {
      console.warn('[bilibili.searchTracks] failed:', e);
      // 兜底不抛出，避免影响其它平台聚合
      return [];
    }
  }

  /** 新的统一接口：仅在命中 BV 时组装 FusionSearchResult，否则直接空结果 */
  async search(keyword: string): Promise<FusionSearchResult> {
    const EMPTY: FusionSearchResult = { track_result: [], playlist_result: [] };

    try {
      const kw = (keyword ?? '').trim();
      if (!kw) return EMPTY;

      const m = kw.match(/BV([0-9A-Za-z]+)/i);
      if (!m) {
        // 未命中 BV —— 不发任何请求
        return EMPTY;
      }

      const bvid = m[1];
      const videoInfo = await this.bilibili.getVideoInfo(bvid);
      const tracks = this.toTracksFromVideo(videoInfo) ?? [];

      const playlist_result =
        Array.isArray(videoInfo?.pages) && videoInfo.pages.length > 1
          ? [{
            creator: videoInfo.owner?.name || 'UP主',
            description: videoInfo.desc || '',
            playlist_cover: videoInfo.cover,
            platform: Platform.BILIBILI,
            platform_unique_id: videoInfo.bvid,
            title: videoInfo.title,
            tracks,
          } as PlaylistEntity]
          : [];

      return { track_result: tracks, playlist_result };
    } catch (e) {
      console.warn('[Bilibili.search] failed:', e);
      return EMPTY;
    }
  }

  async getTrackLink(uniqueId: string): Promise<string> {
    const { bvid, p } = this.parseUniqueId(uniqueId);
    const info = await this.bilibili.getVideoInfo(bvid);
    const page = info.pages[(p - 1) | 0];
    if (!page) throw new Error(`No page ${p} for ${bvid}`);
    const play = await this.bilibili.getPlayUrl(bvid, page.cid);
    return play.audioUrl;
  }

  /** B 站没有标准“歌词” */
  async getLyrics(_uniqueId: string): Promise<Lyric | void> {
    void _uniqueId; // 防止未使用参数 lint 报错
    return;
  }

  isFree(_song: unknown): boolean {
    void _song;
    return true;
  }

  /** 支持 "BV...?p=N"、"BV...:p=N"、"BV..._pN"，默认 p=1 */
  private parseUniqueId(uniqueId: string): { bvid: string; p: number } {
    const raw = uniqueId.trim();
    // BVxxx?...?p=2 / BVxxx?p=2
    const mQ = raw.match(/^([a-zA-Z0-9]+)(?:\?p=(\d+))?$/);
    if (mQ) return { bvid: mQ[1], p: Number(mQ[2] ?? 1) || 1 };
    // BVxxx:p=2 / BVxxx_p2 / BVxxx:p2
    const mC = raw.match(/^([a-zA-Z0-9]+)[:_]?p(?:=)?(\d+)$/i);
    if (mC) return { bvid: mC[1], p: Number(mC[2]) || 1 };
    return { bvid: raw, p: 1 };
  }
}