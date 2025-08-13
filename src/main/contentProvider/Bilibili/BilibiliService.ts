import type { AxiosInstance } from 'axios';
import axios from 'axios';
import md5 from 'md5';
import { injectable } from 'inversify';

/** B 站 VideoInfo 抽象（最小集：只保留我们用得到的字段） */
export interface BiliVideoInfo {
  bvid: string;
  title: string;
  desc?: string;
  cover: string; // pic
  owner: { name: string; mid: number };
  pages: Array<{ bvid: string; cid: number; part: string; duration: number }>;
}

export interface PlayUrl {
  audioUrl: string;
  mime: string;
  qualityId: number;
  codecs?: string;
  expireAt: number; // epoch ms
}

type PlayUrlCacheEntry = { value: PlayUrl; createdAt: number };

@injectable()
export class BilibiliService {
  private http: AxiosInstance;
  /** 简单缓存：key = `${bvid}:${cid}` */
  private playUrlCache = new Map<string, PlayUrlCacheEntry>();
  /** 缓存有效期（毫秒），默认 ~110 分钟，避免过早过期 */
  private PLAY_URL_TTL = 110 * 60 * 1000;

  constructor() {
    this.http = axios.create({
      baseURL: 'https://api.bilibili.com',
      timeout: 12000,
      // HTTP 层面也加个默认 Referer（主进程我们已统一注入，这里只是兜底）
      headers: { Referer: 'https://www.bilibili.com' },
      withCredentials: true,
      validateStatus: (s) => s >= 200 && s < 300,
    });
  }

  /** ============ WBI 签名 ============ */
  private static readonly MIXIN_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14,
    39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59,
    6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
  ];

  private static mixinKey(orig: string) {
    return BilibiliService.MIXIN_TAB.map((i) => orig[i]).join('').slice(0, 32);
  }

  private async getWbiKeys(): Promise<{ mixin: string }> {
    const r = await this.http.get('/x/web-interface/nav');
    const img = r.data?.data?.wbi_img?.img_url ?? '';
    const sub = r.data?.data?.wbi_img?.sub_url ?? '';
    const imgKey = img.split('/').pop()?.split('.')[0] ?? '';
    const subKey = sub.split('/').pop()?.split('.')[0] ?? '';
    return { mixin: BilibiliService.mixinKey(imgKey + subKey) };
  }

  private signWbi(params: Record<string, any>, mixin: string) {
    const wts = Math.round(Date.now() / 1000);
    const filtered: Record<string, string> = {};
    for (const k of Object.keys(params)) filtered[k] = String(params[k]).replace(/[!'()*]/g, '');
    const sorted = Object.keys(filtered)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(filtered[k])}`)
      .join('&');
    const w_rid = md5(sorted + mixin);
    return { ...params, wts, w_rid };
  }

  /** ============ 基础信息 ============ */

  /** BV → 视频信息（含全部分P） */
  async getVideoInfo(bvid: string): Promise<BiliVideoInfo> {
    const r = await this.http.get('/x/web-interface/view', { params: { bvid } });
    if (r.data?.code !== 0) throw new Error(`view failed: ${r.data?.code}`);
    const d = r.data.data;
    const pages = (d?.pages ?? []).map((p: any) => ({
      bvid,
      cid: p.cid as number,
      part: p.part as string,
      duration: Number(p.duration ?? 0),
    }));
    return {
      bvid,
      title: d.title as string,
      desc: d.desc as string,
      cover: d.pic as string,
      owner: { name: d.owner?.name as string, mid: Number(d.owner?.mid) || 0 },
      pages,
    };
  }

  /** 可选：只拿 CID（通常不单独调用） */
  async getCID(bvid: string): Promise<number> {
    const info = await this.getVideoInfo(bvid);
    return info.pages[0]?.cid ?? 0;
  }

  /** ============ 取音轨直链（含缓存 & 兜底） ============ */

  async getPlayUrl(bvid: string, cid?: number): Promise<PlayUrl> {
    if (!cid) cid = await this.getCID(bvid);
    const cacheKey = `${bvid}:${cid}`;
    const now = Date.now();
    const cached = this.playUrlCache.get(cacheKey);
    if (cached && now - cached.createdAt < this.PLAY_URL_TTL) {
      return cached.value;
    }

    // 优先走 WBI 接口（稳定、包含 DASH）
    let play: PlayUrl | null = null;
    try {
      const { mixin } = await this.getWbiKeys();
      const baseParams = {
        bvid,
        cid,
        fnval: 4048,       // 全量 DASH（含音轨）
        qn: 127,
        otype: 'json',
        platform: 'pc',
        fourk: 1,
        gaia_source: 'view-card',
      };
      const signed = this.signWbi(baseParams, mixin);
      const pr = await this.http.get('/x/player/wbi/playurl', { params: signed });

      if (pr.data?.code === 0) {
        const audios: any[] = pr.data?.data?.dash?.audio ?? [];
        if (audios.length) {
          const prefer = [30280, 30232, 30216];
          const pick = prefer.map((id) => audios.find((a) => a.id === id)).find(Boolean) ?? audios[0];
          const url: string = pick.baseUrl || pick.base_url;
          const mime: string = (pick.mimeType || 'audio/mp4').split(';')[0];
          const out: PlayUrl = {
            audioUrl: url,
            mime,
            qualityId: pick.id,
            codecs: pick.codecs,
            expireAt: now + this.PLAY_URL_TTL,
          };
          play = out;
        }
      }
    } catch (e) {
      // ignore -> fallback
    }

    // 兜底：旧接口（某些情况下仍可用）
    if (!play) {
      const pr = await this.http.get('/x/player/playurl', {
        params: { cid, bvid, qn: 64, fnval: 16, otype: 'json', platform: 'pc' },
      });
      if (pr.data?.code !== 0) throw new Error(`playurl failed: ${pr.data?.code}`);
      const audioArr: any[] = pr.data?.data?.dash?.audio ?? [];
      if (!audioArr.length) throw new Error('no audio stream');
      const url: string = audioArr[0].baseUrl || audioArr[0].base_url;
      const mime: string = (audioArr[0].mimeType || 'audio/mp4').split(';')[0];
      play = {
        audioUrl: url,
        mime,
        qualityId: audioArr[0].id ?? 0,
        codecs: audioArr[0].codecs,
        expireAt: now + this.PLAY_URL_TTL,
      };
    }

    this.playUrlCache.set(cacheKey, { value: play!, createdAt: now });
    return play!;
  }

  /** ============ 合集/收藏/收藏夹 拉取 ============ */

  /** 合集（series）→ 多个 BVID → 批量拉 VideoInfo */
  async getSeries(mid: string | number, sid: string | number): Promise<BiliVideoInfo[]> {
    // 这个接口页码 1 起；但“0”也会返回全部，这里按 0 取全（与原 DataProcess 一致）
    const url = `https://api.bilibili.com/x/series/archives?mid=${mid}&series_id=${sid}&only_normal=true&sort=desc&pn=0&ps=30`;
    const rs = await axios.get(url, { headers: { Referer: 'https://www.bilibili.com' }, timeout: 15000 });
    const archives: any[] = rs.data?.data?.archives ?? [];
    return this.batchVideoInfos(archives.map((a) => a.bvid));
  }

  /** 合集（collection/polymer） */
  async getCollection(mid: string | number, sid: string | number, favList: string[] = []): Promise<BiliVideoInfo[]> {
    const first = await axios.get(
      `https://api.bilibili.com/x/polymer/space/seasons_archives_list?mid=${mid}&season_id=${sid}&sort_reverse=false&page_num=1&page_size=30`,
      { headers: { Referer: 'https://www.bilibili.com' }, timeout: 15000 },
    );
    const meta = first.data?.data?.meta;
    const page = first.data?.data?.page;
    const total = Number(meta?.total ?? 0);
    const size = Number(page?.page_size ?? 30);
    const totalPages = Math.max(1, Math.ceil(total / size));

    const pageReqs = Array.from({ length: totalPages - 1 }, (_, i) =>
      axios.get(
        `https://api.bilibili.com/x/polymer/space/seasons_archives_list?mid=${mid}&season_id=${sid}&sort_reverse=false&page_num=${i + 2}&page_size=${size}`,
        { headers: { Referer: 'https://www.bilibili.com' }, timeout: 15000 },
      ),
    );

    const bvids = new Set<string>();
    const read = (json: any) => {
      (json?.data?.archives ?? []).forEach((m: any) => {
        if (!favList.includes(m.bvid)) bvids.add(m.bvid);
      });
    };

    read(first.data);
    const rest = await Promise.all(pageReqs);
    rest.forEach((r) => read(r.data));

    return this.batchVideoInfos([...bvids]);
  }

  /** 收藏夹（media_id） */
  async getFavList(mediaId: string | number): Promise<BiliVideoInfo[]> {
    const first = await axios.get(
      `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${mediaId}&pn=1&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp`,
      { headers: { Referer: 'https://www.bilibili.com' }, timeout: 15000 },
    );
    const data = first.data?.data;
    const count = Number(data?.info?.media_count ?? 0);
    const totalPages = Math.max(1, Math.ceil(count / 20));

    const bvids: string[] = (data?.medias ?? []).map((m: any) => m.bvid);
    const pages = Array.from({ length: totalPages - 1 }, (_, i) =>
      axios.get(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${mediaId}&pn=${i + 2}&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp`,
        { headers: { Referer: 'https://www.bilibili.com' }, timeout: 15000 },
      ),
    );

    const rest = await Promise.all(pages);
    rest.forEach((r) => {
      const js = r.data;
      if (js?.data?.has_more) {
        (js.data.medias ?? []).forEach((m: any) => bvids.push(m.bvid));
      }
    });

    return this.batchVideoInfos(bvids);
  }

  /** 批量拿 VideoInfo（含并发限制） */
  private async batchVideoInfos(bvids: string[], concurrency = 6): Promise<BiliVideoInfo[]> {
    const out: BiliVideoInfo[] = [];
    let i = 0;
    const next = async () => {
      while (i < bvids.length) {
        const cur = i++;
        try {
          const v = await this.getVideoInfo(bvids[cur]);
          out.push(v);
        } catch {
          // ignore 404/失败
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, bvids.length) }, () => next()));
    return out;
  }
}