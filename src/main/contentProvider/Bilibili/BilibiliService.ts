import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import md5 from 'md5';
import { injectable } from 'inversify';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

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

/** 关键字视频搜索返回项（归一化） */
export interface BiliSearchVideoItem {
  bvid: string;
  title: string;      // 已去掉<em>高亮
  author: string;
  duration: number;   // 秒
  cover: string;      // https
}

@injectable()
export class BilibiliService {
  private http: AxiosInstance;
  private jar = new CookieJar();

  /** 简单缓存：key = `${bvid}:${cid}` */
  private playUrlCache = new Map<string, PlayUrlCacheEntry>();
  /** 缓存有效期（毫秒），默认 ~110 分钟，避免过早过期 */
  private PLAY_URL_TTL = 110 * 60 * 1000;

  constructor() {
    // 用 cookiejar 支持 + 伪装为浏览器
    this.http = wrapper(axios.create({
      baseURL: 'https://api.bilibili.com',
      timeout: 12000,
      withCredentials: true,
      // 允许在 Node 里像浏览器一样带 Cookie
      validateStatus: (s) => s >= 200 && s < 300,
      headers: {
        // ← 别用 axios/1.9.0 这种 UA，会更容易 412
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.bilibili.com',
      },
    } as AxiosRequestConfig));
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
    const r = await this.http.get('/x/web-interface/nav', { jar: this.jar });
    const img = r.data?.data?.wbi_img?.img_url ?? '';
    const sub = r.data?.wbi_img?.sub_url ?? r.data?.data?.wbi_img?.sub_url ?? '';
    const imgKey = img.split('/').pop()?.split('.')[0] ?? '';
    const subKey = sub.split('/').pop()?.split('.')[0] ?? '';
    return { mixin: BilibiliService.mixinKey(imgKey + subKey) };
  }

  private signWbi(params: Record<string, any>, mixin: string) {
    const wts = Math.round(Date.now() / 1000);
    // 过滤特殊字符
    const filtered: Record<string, string> = {};
    for (const k of Object.keys(params)) filtered[k] = String(params[k]).replace(/[!'()*]/g, '');
    // 排序 & 编码
    const sorted = Object.keys(filtered)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(filtered[k])}`)
      .join('&');
    const w_rid = md5(sorted + mixin);
    return { ...params, wts, w_rid };
  }

  /** ============ database.sqlit会话 & 工具 ============ */

  private static stripHtml(input: string): string {
    const noTags = input.replace(/<[^>]+>/g, '');
    return noTags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'');
  }

  private static toHttps(url: string): string {
    if (!url) return url;
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
    return url;
  }

  private static parseDuration(val: string | number): number {
    if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.floor(val));
    const s = String(val || '').trim();
    if (!s) return 0;
    const parts = s.split(':').map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
    if (!parts.length) return 0;
    let sec = 0;
    for (const p of parts) sec = sec * 60 + p;
    return sec;
  }

  private static readonly DEFAULT_HEADERS = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Referer': 'https://www.bilibili.com',
    'Origin': 'https://www.bilibili.com',
  };

  private lastReqAt = 0;

  /** 简单节流：两次调用至少间隔 420~600ms（含抖动） */
  private async throttle(minGapMs = 420) {
    const now = Date.now();
    const gap = this.lastReqAt + minGapMs - now;
    if (gap > 0) {
      const jitter = Math.floor(80 + Math.random() * 100);
      await new Promise(r => setTimeout(r, gap + jitter));
    }
    this.lastReqAt = Date.now();
  }

  /** 打一次前台首页 + nav，吃下必要 Cookie，降低 412 概率 */
  private async ensureSession(force = false) {
    // 1) 访问首页（很多关键 Cookie 在这里下发）
    if (force) {
      // 强制刷新时先等一下再打
      await new Promise(r => setTimeout(r, 150 + Math.random() * 150));
    }
    await this.throttle();
    await this.http.get('https://www.bilibili.com/', {
      baseURL: undefined,
      headers: BilibiliService.DEFAULT_HEADERS,
      withCredentials: true,
    });

    // 2) 再拉一次 nav（WBI 也依赖这个上下文）
    await this.throttle();
    await this.http.get('/x/web-interface/nav', {
      headers: BilibiliService.DEFAULT_HEADERS,
      withCredentials: true,
    });
  }

  /** ============ 基础信息 ============ */

  /** BV → 视频信息（含全部分P） */
  async getVideoInfo(bvid: string): Promise<BiliVideoInfo> {
    await this.ensureSession();
    const r = await this.http.get('/x/web-interface/view', { params: { bvid }, jar: this.jar });
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
      cover: BilibiliService.toHttps(d.pic as string),
      owner: { name: d.owner?.name as string, mid: Number(d.owner?.mid) || 0 },
      pages,
    };
  }

  /** 仅拿 CID（通常不单独调用） */
  async getCID(bvid: string): Promise<number> {
    const info = await this.getVideoInfo(bvid);
    return info.pages[0]?.cid ?? 0;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** ============ 取音轨直链（含缓存 & 兜底） ============ */
  async getPlayUrl(bvid: string, cid?: number): Promise<PlayUrl> {
    await this.ensureSession();
    if (!cid) cid = await this.getCID(bvid);
    const cacheKey = `${bvid}:${cid}`;
    const now = Date.now();
    const cached = this.playUrlCache.get(cacheKey);
    if (cached && now - cached.createdAt < this.PLAY_URL_TTL) {
      return cached.value;
    }

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
      const pr = await this.http.get('/x/player/wbi/playurl', { params: signed, jar: this.jar });

      if (pr.data?.code === 0) {
        const audios: any[] = pr.data?.data?.dash?.audio ?? [];
        if (audios.length) {
          const prefer = [30280, 30232, 30216];
          const pick = prefer.map((id) => audios.find((a) => a.id === id)).find(Boolean) ?? audios[0];
          const url: string = pick.baseUrl || pick.base_url;
          const mime: string = (pick.mimeType || 'audio/mp4').split(';')[0];
          play = {
            audioUrl: url,
            mime,
            qualityId: pick.id,
            codecs: pick.codecs,
            expireAt: now + this.PLAY_URL_TTL,
          };
        }
      }
    } catch {
      // ignore -> fallback
    }

    // 兜底：旧接口
    if (!play) {
      const pr = await this.http.get('/x/player/playurl', {
        params: { cid, bvid, qn: 64, fnval: 16, otype: 'json', platform: 'pc' },
        jar: this.jar,
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
        expireAt: now + this.Play_URL_TTL_Fallback(),
      };
    }

    this.playUrlCache.set(cacheKey, { value: play!, createdAt: now });
    return play!;
  }

  // 防止偶发设备时间误差导致 TTL 过短
  private Play_URL_TTL_Fallback() {
    return Math.max(this.PLAY_URL_TTL * 0.8, 45 * 60 * 1000);
  }

}


/** 测试用例 */
// if (require.main === module) {
//   (async () => {
//     const bili = new BilibiliService();
//     try {
//       await bili.ensureSession(true);
//       const info = await bili.getVideoInfo('BV1nW411g7ab');
//       console.log('Video Info:', info);
//       const playUrl = await bili.getPlayUrl(info.bvid, info.pages[0].cid);
//       console.log('Play URL:', playUrl);
//     } catch (e) {
//       console.error('Error:', e);
//     }
//   })();
// }