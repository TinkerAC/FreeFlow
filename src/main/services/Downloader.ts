import fs from 'fs';
import path from 'path';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import * as cheerio from 'cheerio';
import StreamZip from 'node-stream-zip';
import ProgressBar from 'progress';
import chalk from 'chalk';
import { getLanzouDirectLink } from '@src/utils/lanzouUtils';
import { inject, injectable } from 'inversify';
import ElectronStore from 'electron-store';
import { HifiniCookies } from '@src/shared/hifiniCookies';
import * as os from 'node:os';
import { DataPath} from '@main/core/pathConfig';

import { DISymbol } from '@main/di/symbol';

// ----------------- 类型定义 -----------------
export interface LinkInfo {
  originalLink: string;
  code: string;
  directLink?: string;
  fileName?: string;
  filePath?: string;
  downloadSuccess: boolean;
  downloadError?: string;
  extractedFiles: string[];
  extractionSuccess: boolean;
  extractionError?: string;
}


export interface DownloadMeta {
  trackId: number;          // 业务主键
  token: string;            // 唯一任务 ID
  fileName?: string;        // 真正文件名
  totalBytes?: number;      // 总大小
  savePath?: string;        // 本地路径
}


//全局唯一的下载注册表实例
@injectable()
export class HifiniDownloader {
  private axios: AxiosInstance;
  private readonly downloadDir: string;
  private readonly musicDir: string;

  private readonly registry = new Map<string, DownloadMeta>();

  constructor(
    @inject(DISymbol.Store) private readonly store: ElectronStore,
    @inject(DISymbol.DataPath) private readonly dataPath:DataPath
  ) {
    const cookies: HifiniCookies = store.get('hifini_cookie');
    // 下载目录使用系统临时目录
    this.downloadDir = os.tmpdir();
    this.musicDir = this.dataPath.musicDir
    console.log('下载目录:', this.downloadDir);
    console.log('音乐目录:', this.musicDir);
    const cookieHeader = `bbs_sid=${cookies.bbs_sid}; bbs_token=${cookies.bbs_token}`;
    this.axios = axios.create({
      baseURL: 'https://www.hifini.com/',
      headers: {
        Cookie: cookieHeader,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });

    fs.mkdirSync(this.downloadDir, { recursive: true });
    fs.mkdirSync(this.musicDir, { recursive: true });
  }

  /** 仅注册 track → token，文件信息稍后补充 */
  public registerDownload(token: string, trackId: number): void {
    this.registry.set(token, { token, trackId });
  }

  /** will-download 回调里补充文件信息 */
  public fillMeta(token: string, fileName: string, total: number, savePath: string) {
    const meta = this.registry.get(token);
    if (meta) Object.assign(meta, { fileName, totalBytes: total, savePath });
  }

  public getMeta(token: string): DownloadMeta | undefined {
    return this.registry.get(token);
  }

  public delete(token: string): void {
    this.registry.delete(token);
  }

  /**
   * 下载文件并显示进度条
   * @param url 下载链接
   * @param fileName 文件保存路径（相对或绝对都可以）
   * @returns {Promise<string>} 返回下载后的文件在本地的绝对路径
   */
  public async downloadFileWithProgress(url: string, fileName: string): Promise<string> {
    // 解析为绝对路径
    const resolvedPath = path.resolve(fileName);

    // 发起 GET 流式请求
    const { data, headers } = await this.axios.get(url, { responseType: 'stream' });
    const total = Number(headers['content-length'] || 0);

    // 创建进度条
    const bar = new ProgressBar(
      `${chalk.green('下载中')} [:bar] :percent :rate/bps :etas`,
      { total, width: 40 },
    );

    // 将流写入文件并在完成后 resolve
    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(resolvedPath);
      data.on('data', (chunk: Buffer) => bar.tick(chunk.length));
      data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    // 下载完成后返回绝对路径
    return resolvedPath;
  }

  /**
   * 提取 ZIP 文件中的第一个 .flac 音频文件
   * @param zipPath ZIP 文件的完整路径
   * @param destDir 解压目标目录
   * @returns {Promise<string>} 返回提取后的 .flac 文件名
   * @throws {Error} ZIP 文件不存在或未找到 .flac 文件
   */
  public async extractFlacFile(zipPath: string, destDir: string): Promise<string> {
    if (!fs.existsSync(zipPath)) {
      throw new Error('ZIP 文件不存在');
    }

    // 打开 ZIP
    const zip = new StreamZip.async({ file: zipPath, nameEncoding: 'gbk' });

    try {
      const entries = await zip.entries();
      for (const name of Object.keys(entries)) {
        if (name.toLowerCase().endsWith('.flac')) {
          // 确保目标目录存在
          fs.mkdirSync(destDir, { recursive: true });

          const fileName = path.basename(name);
          const outPath = path.join(destDir, fileName);

          // 提取第一个 .flac 文件
          await zip.extract(name, outPath);

          return fileName;
        }
      }

      // 如果循环结束还没找到 .flac
      throw new Error('ZIP 中未找到任何 .flac 文件');
    } finally {
      // 无论如何都要关闭 ZIP
      await zip.close();
    }
  }

  public async getLanzouDirectLink(dataHref: string): Promise<string[]> {
    // 1. 首次拉取帖子页面
    let html = await this.axios
      .get<string>(dataHref, { responseType: 'text' })
      .then(res => res.data);

    // 2. 如果未评论，先自动评论再重拉一次
    if (html.includes('本帖含有隐藏内容')) {
      console.log(chalk.yellow('未检测到评论，正在自动评论…'));
      await this.postComment(dataHref);
      html = await this.axios
        .get<string>(dataHref, { responseType: 'text' })
        .then(res => res.data);
      console.log(chalk.green('评论完成，已重新拉取页面'));
    }

    // 3. 解析所有隐藏的蓝奏云分享链接及其提取码
    const { links, codes } = this.parseHiddenContent(html);
    console.log(chalk.green('发现下载链接:'), links);
    console.log(chalk.green('发现提取码:'), codes);

    // 4. 逐条处理，调用外部工具拿到直链
    const directUrls: string[] = [];
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const code = codes[i] || '';
      try {
        if (!this.isValidUrl(link)) {
          throw new Error('URL 格式不合法');
        }
        console.log(chalk.blue(`解析第 ${i + 1} 条直链，原始链接：`), link);
        const direct = await getLanzouDirectLink(link, code);
        console.log(chalk.blue(`解析成功：`), direct);
        directUrls.push(direct);
      } catch (err: any) {
        console.error(chalk.red(`第 ${i + 1} 条直链解析失败:`), err.message);
        // 不抛出，继续下一个
      }
    }

    // 5. 返回所有成功解析到的直链
    return directUrls;
  }

  private async postComment(dataHref: string): Promise<void> {
    const trackId = dataHref.match(/\d+/)?.[0];
    if (!trackId) throw new Error('无法解析帖子 ID');
    const url = `post-create-${trackId}-1.htm`;
    await this.axios.post(
      url,
      new URLSearchParams({
        doctype: '1',
        return_html: '1',
        quotepid: '0',
        message: '感谢分享',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    console.log(chalk.green('评论成功'));
  }

  private parseHiddenContent(html: string): { links: string[]; codes: string[] } {
    const $ = cheerio.load(html);
    const container = $('div.message.break-all');
    if (!container.length) throw new Error('未找到隐藏内容');

    // 提取 CSS 类并重组提取码
    const classGroups: string[][] = [];
    container.find('style').each((_, el) => {
      const txt = $(el).text().split('{display:inline !important;}')[0];
      const classes = txt.split(',').map(s => s.replace('.', '').trim());
      classGroups.push(classes);
    });
    const codes = classGroups.map(clsGroup =>
      clsGroup.map(cls => container.find(`span.${cls}`).text()).join(''),
    );

    // 提取所有 lanzou 链接
    const matches: string[] = html.match(/https?:\/\/[\w./?=&%-]+/g) ?? [];
    const links: string[] = Array.from(
      new Set(matches.filter((u): u is string => u.includes('lanz'))),
    );
    if (links.length !== codes.length) {
      return { links: links.slice(-1), codes: codes.slice(-1) };
    }
    return { links, codes };
  }

  private isValidUrl(u: string): boolean {
    try {
      const { protocol, host } = new URL(u);
      return Boolean(protocol && host);
    } catch {
      return false;
    }
  }
}
