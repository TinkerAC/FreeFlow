// file: src/main/services/HifiniMusicService.ts

import axios from 'axios';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import { getRandom } from 'random-useragent';
import path from 'path';
import { fileURLToPath } from 'url';
import { inject, injectable } from 'inversify';
import { getConfig } from '@main/services/ConfigService';
import HifiniThreadCacheRepository from '@main/repository/HifiniThreadCacheRepository';
import { HifiniThreadCacheModel } from '@src/shared/types';
import { isSameUTCDay } from '@src/utils/timeUtils';
import ElectronStore from 'electron-store';

@injectable()
export default class HifiniMusicService {
  private readonly __filename: string;
  private __dirname: string;

  constructor(
    @inject('Store') private store: ElectronStore,
    @inject('HifiniThreadCacheRepository') private hifiniThreadCacheRepository: HifiniThreadCacheRepository,
  ) {
    // 获取当前模块的文件名和目录名
    this.__filename = fileURLToPath(import.meta.url);
    this.__dirname = path.dirname(this.__filename);
  }

  // 接受关键词并搜索，返回歌曲结果的 JSON 对象
  public async search(keyword: string): Promise<any[]> {
    const extractLiElements = (html: string) => {
      const $ = cheerio.load(html);
      return $('div.card.search div.card-body ul li').toArray();
    };

    const parseLiElement = (liElement: any) => {
      const commonFormats = ['FLAC', 'MP3', 'WAV', 'AAC', 'ALAC', 'AIFF', 'DSD', 'APE', 'OGG', 'M4A', 'WMA'];
      const $li = cheerio.load(liElement);
      const dataHref = $li('li').attr('data-href');
      const title = $li('div.subject a').text();
      const isAlbum = title.includes('专辑') ? 1 : 0;
      const formats = commonFormats.filter(format => title.toUpperCase().includes(format));
      const isExpired = title.includes('失效') ? 1 : 0;
      const heat = parseInt($li('span.eye.comment-o.ml-2.hidden-sm.d-none').text().trim(), 10) || 0;

      return { dataHref, heat, title, isAlbum, formats, isExpired };
    };

    const searchUrl = `https://hifini.com/search-${encodeURIComponent(keyword)}-1.htm`;

    try {
      const response = await axios.get(searchUrl, {
        headers: {
          'User-Agent': getRandom(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
          'DNT': '1', // 防止部分爬虫检测
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000, // 设置超时时间10秒
      });

      const liElements = extractLiElements(response.data);
      return liElements.map(parseLiElement);

    } catch (error) {
      // 检查是否是超时错误
      if (error.code === 'ECONNABORTED') {
        console.error('搜索超时:', error.message);
      } else {
        console.error('搜索出错:', error);
      }
      return [];
    }
  }

  // 获取重定向后的真实播放链接
  private async getRedirectUrl(url: string): Promise<string> {
    try {
      const response = await axios.head(url, {
        headers: { referer: 'https://www.hifini.com' },
        maxRedirects: 5, // 设置为你想要的重定向次数限制
      });
      return response.request.res.responseUrl; // 获取最终重定向后的 URL
    } catch (error) {
      console.error('Error in fetching redirect URL:', error);
      throw error;
    }
  }

  // Base32 编码函数
  private base32Encode(str: string): string {
    const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '', base32 = '';

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

  // 从网站源码中提取参数
  private generateParam(data: string): string {
    const key = '95wwwHiFiNicom27';
    let outText = '';

    for (let i = 0, j = 0; i < data.length; i++, j++) {
      if (j === key.length) j = 0;
      outText += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(j));
    }

    return this.base32Encode(outText);
  }

  private isRedirectedUrlValid(redirected_url: string): boolean {
    // 黑名单
    if (redirected_url.includes('https://music.163.com/m/download')) {
      return false;
    }
    return true;
  }

  // 获取音乐链接的函数
  public async getMusicLink(dataHref: string): Promise<string> {
    try {
      // 从数据库中获取相关记录
      const threadCache: HifiniThreadCacheModel = await this.hifiniThreadCacheRepository.findByDataHref(dataHref);
      let un_redirected_url: string;

      // 获取当前日期,如果缓存存在且是今天的，使用缓存的未重定向链接
      const currentDate = new Date();

      console.log('threadCache:', threadCache);


      if (threadCache &&
        threadCache.cached_at &&
        isSameUTCDay(threadCache.cached_at, currentDate)) {

        // // 如果缓存存在且是今天的，使用缓存的未重定向链接
        // if (threadCache.cached_at ! instanceof Date) {
        //   console.error('缓存的 cached_at 不是 Date 类型');
        //   console.log('threadCache:', threadCache);
        //   console.log(typeof threadCache.cached_at);
        //   console.log('cached_at value:', threadCache.cached_at);
        //   console.log('cached_at constructor:', threadCache.cached_at.constructor.name);
        // }

        un_redirected_url = threadCache.un_redirected_url;
        console.log('使用缓存中的未重定向链接加载 dataHref:', dataHref, '链接:', un_redirected_url);

      } else {
        // 如果没有缓存或缓存已过期，获取新的音乐信息并保存
        const data = await this.fetchAndSaveMusicInfo(dataHref);

        if (!data.un_redirected_url) {
          throw new Error('未找到未重定向链接，可能原因：网页上没有音乐播放器、登录状态失效');
        }

        un_redirected_url = data.un_redirected_url;

        console.log('使用新获取的未重定向链接加载 dataHref:', dataHref, '链接:', un_redirected_url);
      }

      // 获取重定向后的最终链接
      const redirected_url = await this.getRedirectUrl(un_redirected_url);

      if (!this.isRedirectedUrlValid(redirected_url)) {
        throw new Error('重定向后的链接无效');
      }
      return redirected_url;

    } catch (error) {
      console.error('获取音乐链接时出错:', error);
      throw error;
    }
  }

  // 获取音乐信息的函数
  public async getMusicInfo(dataHref: string): Promise<HifiniThreadCacheModel> {
    try {
      const threadCache: HifiniThreadCacheModel = await this.hifiniThreadCacheRepository.findByDataHref(dataHref);
      if (threadCache) {
        return threadCache;
      } else {
        const data = await this.fetchAndSaveMusicInfo(dataHref);
        console.log('缓存中不存在音乐信息，已获取并保存:', {
          data_href: dataHref,
          title: data.title,
          artist: data.artist,
          cover_src: data.cover_src,
        });

        return data;
      }

    } catch (error) {
      console.error('Error getting music info:', error);
      throw error;
    }
  }

  // 抓取并保存音乐信息的辅助函数
  private async fetchAndSaveMusicInfo(dataHref: string): Promise<HifiniThreadCacheModel> {
    const cookies = getConfig(this.store, 'hifini_cookie');
    console.log('获取到的 hifini_cookie:', cookies);

    if (!cookies || !cookies.bbs_sid || !cookies.bbs_token) {
      throw new Error('未找到 hifini_cookie');
    }

    try {
      const cookieString = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join('; ');
      const html = await axios.get('https://hifini.com/' + dataHref, {
        headers: {
          referer: 'https://www.hifini.com',
          cookie: cookieString,
        },
      }).then(response => response.data);

      const dom = new JSDOM(html);
      const scripts = dom.window.document.querySelectorAll('script');

      let scriptContent = '';
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('APlayer')) {
          scriptContent = script.textContent;
          break;
        }
      }

      // 如果有包含 "APlayer" 的脚本内容（页面上有外链的音乐播放器）
      if (scriptContent) {

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const musicMatch = scriptContent.match(/music:\s*\[(.*?)\]/s);

        if (!musicMatch) throw new Error('Music array not found in script.');

        const musicItems = musicMatch[1].match(/{[^}]+}/g);
        for (const item of musicItems) {
          const titleMatch = item.match(/title:\s*'([^']+)'/);
          const authorMatch = item.match(/author:\s*'([^']+)'/);
          const picMatch = item.match(/pic:\s*'([^']+)'/);
          const urlMatch = item.match(/url:\s*'([^']+)'/);

          if (titleMatch && authorMatch && picMatch && urlMatch) {
            let url = urlMatch[1];
            const paramMatch = item.match(/generateParam\('([^']+)'\)/);
            if (paramMatch) {
              url += this.generateParam(paramMatch[1]);
            }

            if (!url.startsWith('http')) {
              url = 'https://www.hifini.com/' + url;
            }

            const title = titleMatch[1];
            const artist = authorMatch[1];
            const cover_src = picMatch[1];
            const un_redirected_url = url;

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
      } else {
        console.warn('页面上没有外链的音乐播放器, dataHref:', dataHref, '链接:', 'https://hifini.com/' + dataHref);
        return null;
      }

    } catch (error) {
      console.error('Error fetching and saving music info:', error);
      throw error;
    }
  }

  // 过滤、排序结果并获取音乐信息
  public async getSearchResults(keyword: string): Promise<any[]> {

    try {
      console.log('主进程正在执行搜索操作，关键词:', keyword);

      // 执行搜索操作并记录结果数量
      const searchResults = await this.search(keyword);
      console.info(`搜索操作完成，结果数量: ${searchResults ? searchResults.length : 0}`);

      // 检查搜索结果是否有效
      if (!Array.isArray(searchResults) || searchResults.length === 0) {
        console.warn('搜索结果不是有效的数组或为空，返回空数组');
        return [];
      }

      // 过滤非专辑结果并按热度排序
      const filteredResults = searchResults.filter(result => result.isAlbum === 0);
      console.info(`过滤后结果数量: ${filteredResults.length}`);

      if (filteredResults.length === 0) {
        console.warn('过滤后的结果为空，返回空数组');
        return [];
      }

      // 按热度排序并截取前5个
      const sortedResults = filteredResults.sort((a, b) => b.heat - a.heat).slice(0, 5);
      console.info(`排序并截取前5个结果，准备获取详细信息`);

      // 获取每个结果的详细信息
      const musicInfos = await Promise.all(sortedResults.map(async (result, index) => {
        try {
          console.log(`正在获取第 ${index + 1} 个结果的音乐信息，链接: ${result.dataHref}`);
          const musicInfo = await this.getMusicInfo(result.dataHref);
          console.info(`第 ${index + 1} 个结果的音乐信息获取成功`);
          return musicInfo;

        } catch (error) {
          console.log(`未在 ${result.dataHref} 中找到可播放的音乐`);
          return null;
        }
      }));

      // 过滤掉获取失败的音乐信息
      const validMusicInfos = musicInfos.filter(info => info && info.cover_src); // 如果 cover_src 存在则认为是有效的音乐信息
      console.info(`成功获取到 ${validMusicInfos.length} 个有效的音乐信息`);

      return validMusicInfos;

    } catch (error) {
      console.error('getSearchResults 函数执行出错:', error);
      return [];
    }
  }
}

