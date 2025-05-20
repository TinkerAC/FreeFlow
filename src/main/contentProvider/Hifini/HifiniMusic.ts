import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import { getRandom } from 'random-useragent';
import path from 'path';
import { fileURLToPath } from 'url';
import { inject, injectable } from 'inversify';
import { getConfig } from '@main/services/ConfigService';
import HifiniThreadCacheRepository from '@main/database/repository/HifiniThreadCacheRepository';
import { isSameUTCDay } from '@src/utils/timeUtils';
import ElectronStore from 'electron-store';
import { ContentProvider } from '@main/contentProvider/ContentProvider';
import { HifiniCookie, HifiniSearchResult } from '@main/contentProvider/Hifini/HifiniInterfaces';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { HifiniThreadCacheModel } from '@src/shared/domainModel/hifiniThreadCacheModel';
import { Lyric } from '@src/shared/domainModel/lyricLine';
import { Platform } from '@main/core/enum/Platform';

import { DISymbol } from '@main/di/symbol';


@injectable()
export default class HifiniMusic implements ContentProvider {
  public readonly platformName: Platform;
  public readonly serverNodes: string[] = [];
  private readonly __filename: string;
  private readonly __dirname: string;

  constructor(
    @inject(DISymbol.Store) private store: ElectronStore,
    @inject(DISymbol.HifiniThreadCacheRepository) private hifiniThreadCacheRepository: HifiniThreadCacheRepository,
  ) {
    this.__filename = fileURLToPath(import.meta.url);
    this.__dirname = path.dirname(this.__filename);
    this.platformName = Platform.HIFINI;
  }

  /**
   * 搜索函数：根据关键词返回搜索结果数组
   */
  public async search(keyword: string): Promise<HifiniSearchResult[]> {
    const cookieString: string = this.getCookieString();
    // 从 HTML 中提取包含搜索结果的 li 元素
    const extractLiElements = (html: string): cheerio.Element[] => {
      const $ = cheerio.load(html);
      return $('div.card.search div.card-body ul li').toArray();
    };
    // 解析单个 li 元素为 HifiniSearchResult 对象
    const parseLiElement = (liElement: cheerio.Element): HifiniSearchResult => {
      const commonFormats: string[] = ['FLAC', 'MP3', 'WAV', 'AAC', 'ALAC', 'AIFF', 'DSD', 'APE', 'OGG', 'M4A', 'WMA'];
      const $li = cheerio.load(liElement);
      const dataHref: string = $li('li').attr('data-href') || '';
      const title: string = $li('div.subject a').text() || '';
      const isAlbum: number = title.includes('专辑') ? 1 : 0;
      const formats: string[] = commonFormats.filter(format => title.toUpperCase().includes(format));
      const isExpired: number = title.includes('失效') ? 1 : 0;
      // 提取热度值，转换为数字，若解析失败则默认 0
      const heat: number = parseInt($li('span.eye.comment-o.ml-2.hidden-sm.d-none').text().trim(), 10) || 0;

      return { dataHref, heat, title, isAlbum, formats, isExpired };
    };

    const searchUrl: string = `https://hifini.com/search-${encodeURIComponent(keyword)}-1.htm`;

    try {
      const response: AxiosResponse<string> = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandom(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'DNT': '1',
          'Upgrade-Insecure-Requests': '1',
          cookie: cookieString,
        },
        timeout: 10000,
      });
      const liElements: cheerio.Element[] = extractLiElements(response.data);
      return liElements.map(parseLiElement);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'ECONNABORTED') {
        console.error('搜索超时:', (error as Error).message);
      } else {
        console.error('搜索出错:', error);
      }
      return [];
    }
  }

  /**
   * 获取音乐链接
   * 优化流程：先检查缓存，如果存在当天缓存则直接使用，否则调用 fetchAndSaveMusicInfo 获取新数据，
   * 然后尝试获取重定向后的链接，出错时直接返回未重定向链接。
   */
  public async getTrackLink(dataHref: string, forceReload: boolean = false): Promise<string> {
    try {
      const threadCache: HifiniThreadCacheModel | null = await this.hifiniThreadCacheRepository.findByDataHref(dataHref);
      let un_redirected_url: string;
      const currentDate: Date = new Date();

      console.log('threadCache:', threadCache);

      if (
        !forceReload &&
        threadCache &&
        threadCache.cached_at &&
        isSameUTCDay(threadCache.cached_at, currentDate)
      ) {
        un_redirected_url = threadCache.un_redirected_url;
        console.log('使用缓存中的未重定向链接加载 dataHref:', dataHref, '链接:', un_redirected_url);
      } else {
        const data: HifiniThreadCacheModel | null = await this.fetchAndSaveMusicInfo(dataHref);
        if (!data || !data.un_redirected_url) {
          throw new Error('未找到未重定向链接，可能原因：网页上没有音乐播放器、登录状态失效');
        }
        un_redirected_url = data.un_redirected_url;
        console.log('使用新获取的未重定向链接加载 dataHref:', dataHref, '链接:', un_redirected_url);
      }

      try {
        const redirected_url: string = await this.getRedirectUrl(un_redirected_url);
        console.debug('重定向后的链接:', redirected_url);
        return redirected_url;
      } catch (error: unknown) {
        console.error(`获取重定向后链接时出错，直接使用未重定向链接: ${un_redirected_url}`, error);
        return un_redirected_url;
      }
    } catch (error: unknown) {
      console.error('获取音乐链接时出错:', error);
      throw error;
    }
  }

  /**
   * 获取音乐信息：先尝试从缓存中获取，如果不存在则调用 fetchAndSaveMusicInfo
   */
  public async getMusicInfo(dataHref: string): Promise<HifiniThreadCacheModel> {
    try {
      const threadCache: HifiniThreadCacheModel | null = await this.hifiniThreadCacheRepository.findByDataHref(dataHref);
      if (threadCache) {
        return threadCache;
      } else {
        const data: HifiniThreadCacheModel | null = await this.fetchAndSaveMusicInfo(dataHref);
        if (!data) {
          throw new Error('未能获取到音乐信息并保存');
        }
        console.log('缓存中不存在音乐信息，已获取并保存:', {
          data_href: dataHref,
          title: data.title,
          artist: data.artist,
          cover_src: data.cover_src,
        });
        return data;
      }
    } catch (error: unknown) {
      console.error('Error getting music info:', error);
      throw error;
    }
  }

  /**
   * 获取搜索结果，并转换为 TrackRecord 数组
   */
  public async searchTracks(keyword: string): Promise<TrackEntity[]> {
    try {
      const searchResults: HifiniSearchResult[] = await this.search(keyword);
      console.info(`搜索操作完成，结果数量: ${searchResults?.length || 0}`);

      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        console.warn('搜索结果为空，返回空数组');
        return [];
      }

      // 过滤掉专辑
      const filteredResults: HifiniSearchResult[] = searchResults.filter(
        (result: HifiniSearchResult) => result.isAlbum === 0,
      );
      console.info(`过滤后结果数量: ${filteredResults.length}`);

      if (filteredResults.length === 0) {
        console.warn('过滤后的结果为空，返回空数组');
        return [];
      }

      // 按热度降序排序，并截取前5个
      const sortedResults: HifiniSearchResult[] = filteredResults.sort((a, b) => b.heat - a.heat).slice(0, 5);
      console.info(`排序并截取前5个结果，准备获取详细信息`);

      // 获取每个搜索结果对应的音乐信息
      const musicInfos: (HifiniThreadCacheModel | null)[] = await Promise.all(
        sortedResults.map(async (result: HifiniSearchResult, index: number): Promise<HifiniThreadCacheModel | null> => {
          try {
            console.log(`正在获取第 ${index + 1} 个结果的音乐信息，链接: ${result.dataHref}`);
            const musicInfo: HifiniThreadCacheModel = await this.getMusicInfo(result.dataHref);
            console.info(`第 ${index + 1} 个结果的音乐信息获取成功`);
            return musicInfo;
          } catch (error: unknown) {
            console.log(`未在 ${result.dataHref} 中找到可播放的音乐`);
            return null;
          }
        }),
      );

      const validMusicInfos: HifiniThreadCacheModel[] = musicInfos.filter(
        (info): info is HifiniThreadCacheModel => !!info && !!info.cover_src,
      );
      console.info(`成功获取到 ${validMusicInfos.length} 个有效的音乐信息`);

      // 转换为 TrackRecord 数组（仅设置必要字段）
      return validMusicInfos.map((info: HifiniThreadCacheModel): TrackEntity => {
        return {
          platform: 'Hifini',
          platform_unique_id: info.data_href,
          title: info.title,
          artist: info.artist,
          cover_src: info.cover_src,
          duration: 0,
          album: '',
          created_at: new Date(),
        } as TrackEntity;
      });
    } catch (error: unknown) {
      console.error('searchTracks 函数执行出错:', error);
      return [];
    }
  }

  isFree(): boolean {
    return true;
  }

  async getLyrics(): Promise<Lyric | void> {
    throw new Error('NotImplementedError: HifiniMusic getLyrics not implemented');
  }

  async chooseBestServerNode(): Promise<string> {
    throw Error('NotSupportedError: HifiniMusic chooseBestServerNode not supported');

  }

  /**
   * 私有方法：获取 hifini 请求所需的 cookie 字符串
   * 从 store 中获取 hifini_cookie 配置，并构造标准的 cookie 字符串
   */
  private getCookieString(): string {
    const cookies: HifiniCookie = getConfig<HifiniCookie>(this.store, 'hifini_cookie');
    if (!cookies || !cookies.bbs_sid || !cookies.bbs_token) {
      throw new Error('未找到 hifini_cookie');
    }
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }

  /**
   * 获取重定向后的真实播放链接
   */
  private async getRedirectUrl(url: string): Promise<string> {
    try {
      const response: AxiosResponse = await axios.head(url, {
        headers: { referer: 'https://www.hifini.com' },
        maxRedirects: 5,
      });
      const finalUrl: string = (response.request as any)?.res?.responseUrl;
      if (!finalUrl || typeof finalUrl !== 'string') {
        throw new Error('无法获取最终重定向 URL');
      }
      return finalUrl;
    } catch (error: unknown) {
      console.error('Error in fetching redirect URL:', error);
      throw error;
    }
  }

  /**
   * Base32 编码函数
   */
  private base32Encode(str: string): string {
    const base32chars: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits: string = '', base32: string = '';

    for (let i = 0; i < str.length; i++) {
      bits += str.charCodeAt(i).toString(2).padStart(8, '0');
    }

    bits = bits.padEnd(bits.length + (5 - bits.length % 5) % 5, '0');

    for (let i = 0; i < bits.length; i += 5) {
      base32 += base32chars[parseInt(bits.substring(i, i + 5), 2)];
    }

    return base32.padEnd(base32.length + (8 - base32.length % 8) % 8, '=')
      .replace(/=/g, 'HiFiNiYINYUECICHANG');
  }

  /**
   * 生成参数，用于构造播放链接
   */
  private generateParam(data: string): string {
    const key: string = '95wwwHiFiNicom27';
    let outText: string = '';

    for (let i = 0, j = 0; i < data.length; i++, j++) {
      if (j === key.length) j = 0;
      outText += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(j));
    }
    return this.base32Encode(outText);
  }

  /**
   * 从网页获取并保存音乐信息
   * 优化流程：利用 getCookieString() 获取 cookie 字符串，
   * 并使用 JSDOM 与 cheerio 提取包含音乐信息的脚本内容，
   * 通过正则匹配解析出音乐信息，并保存到缓存库中。
   */
  private async fetchAndSaveMusicInfo(dataHref: string): Promise<HifiniThreadCacheModel | null> {
    // 利用私有方法获取 cookie 字符串
    const cookieString: string = this.getCookieString();
    console.log('使用 cookie:', cookieString);

    try {
      const html: string = await axios.get('https://hifini.com/' + dataHref, {
        headers: {
          referer: 'https://www.hifini.com',
          cookie: cookieString,
        },
      }).then((response: AxiosResponse<string>) => response.data);

      const dom: JSDOM = new JSDOM(html);
      const scripts: NodeListOf<HTMLScriptElement> = dom.window.document.querySelectorAll('script');

      let scriptContent: string = '';
      for (const script of Array.from(scripts)) {
        if (script.textContent && script.textContent.includes('APlayer')) {
          scriptContent = script.textContent;
          break;
        }
      }

      if (!scriptContent) {
        console.warn('页面上没有外链的音乐播放器, dataHref:', dataHref, '链接:', 'https://hifini.com/' + dataHref);
        return null;
      }

      // 解析脚本内容中包含音乐信息的部分
      const musicMatch: RegExpMatchArray | null = scriptContent.match(/music:\s*\[([\s\S]*?)]/);

      if (!musicMatch) throw new Error('Music array not found in script.');

      const musicItems: RegExpMatchArray | null = musicMatch[1].match(/{[^}]+}/g);
      if (!musicItems) {
        console.warn('No valid music items found.');
        return null;
      }

      for (const item of musicItems) {
        const titleMatch: RegExpMatchArray | null = item.match(/title:\s*'([^']+)'/);
        const authorMatch: RegExpMatchArray | null = item.match(/author:\s*'([^']+)'/);
        const picMatch: RegExpMatchArray | null = item.match(/pic:\s*'([^']+)'/);
        const urlMatch: RegExpMatchArray | null = item.match(/url:\s*'([^']+)'/);

        if (titleMatch && authorMatch && picMatch && urlMatch) {
          let url: string = urlMatch[1];
          const paramMatch: RegExpMatchArray | null = item.match(/generateParam\('([^']+)'\)/);
          if (paramMatch) {
            url += this.generateParam(paramMatch[1]);
          }

          if (!url.startsWith('http')) {
            url = 'https://www.hifini.com/' + url;
          }

          const title: string = titleMatch[1];
          const artist: string = authorMatch[1];
          const cover_src: string = picMatch[1];
          const un_redirected_url: string = url;

          return await this.hifiniThreadCacheRepository.save({
            data_href: dataHref,
            title,
            artist,
            cover_src,
            un_redirected_url,
            cached_at: new Date(),
            modified_at: new Date(),
          });
        }
      }
      return null;
    } catch (error: unknown) {
      console.error('Error fetching and saving music info:', error);
      throw error;
    }
  }
}
