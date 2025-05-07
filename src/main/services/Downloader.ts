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
import { music_Dir } from '@main/app/pathConfig';

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

export interface ResultSummary {
  dataHref: string;
  commented: boolean;
  links: LinkInfo[];
  musicPath: string;
}

@injectable()
export class HifiniDownloader {
  private http: AxiosInstance;
  private readonly downloadDir: string;
  private readonly musicDir: string;

  constructor(
    @inject('Store') private readonly store: ElectronStore,
  ) {
    const cookies: HifiniCookies = store.get('hifini_cookie');
    // 下载目录使用系统临时目录
    this.downloadDir = os.tmpdir();
    this.musicDir = music_Dir;
    console.log('下载目录:', this.downloadDir);
    console.log('音乐目录:', this.musicDir);
    const cookieHeader = `bbs_sid=${cookies.bbs_sid}; bbs_token=${cookies.bbs_token}`;
    this.http = axios.create({
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

  /**
   * 批量下载指定帖子内所有蓝奏链接音频
   */
  async downloadFromThread(dataHref: string): Promise<ResultSummary> {
    const summary: ResultSummary = {
      dataHref,
      commented: false,
      links: [],
      musicPath: this.musicDir,
    };

    try {
      // 1. 获取帖子 HTML
      const { data: html } = await this.http.get<string>(dataHref, { responseType: 'text' });

      // 2. 评论帖子（若未评论）
      summary.commented = !html.includes('alert-warning');
      if (!summary.commented) {
        await this.postComment(dataHref);
        summary.commented = true;
      }

      // 3. 解析隐藏内容，提取链接和提取码
      const { links, codes } = this.parseHiddenContent(html);
      console.log(chalk.green('发现下载链接:'), links);
      console.log(chalk.green('发现提取码:'), codes);

      // 4. 遍历每个链接，下载并解压
      for (let i = 0; i < links.length; i++) {
        const linkInfo: LinkInfo = {
          originalLink: links[i],
          code: codes[i] || '',
          downloadSuccess: false,
          extractedFiles: [],
          extractionSuccess: false,
        };
        summary.links.push(linkInfo);

        try {
          if (!this.isValidUrl(links[i])) throw new Error('无效链接');

          // 4.1 获取直链
          console.log(chalk.blue('解析直链:'), links[i]);
          let directUrl = await getLanzouDirectLink(links[i], codes[i]);
          linkInfo.directLink = directUrl;

          /**
           * 并入 downloadFromThread 的下载逻辑中：
           */
          const verifiedUrl = await this.resolveVerification(directUrl);
          console.log(chalk.blue('最终下载 URL:'), verifiedUrl);

          directUrl = verifiedUrl;


          // 4.2 下载 ZIP 文件
          console.log(chalk.blue('开始下载:'), directUrl);
          const fileName = path.basename(new URL(directUrl).pathname);
          const filePath = path.join(this.downloadDir, fileName);
          linkInfo.fileName = fileName;
          linkInfo.filePath = filePath;
          await this.downloadFileWithProgress(directUrl, filePath);
          linkInfo.downloadSuccess = true;
          console.log(chalk.green('下载完成:'), filePath);

          // 4.3 解压 FLAC 音频
          console.log(chalk.blue('开始解压:'), filePath);
          const extracted = await this.extractAudioFiles(filePath, this.musicDir);
          linkInfo.extractedFiles = extracted;
          linkInfo.extractionSuccess = extracted.length > 0;
          console.log(chalk.green('解压完成:'), extracted);
        } catch (err: any) {
          console.error(chalk.red('处理链接失败:'), err.message);
          linkInfo.downloadError = err.message;
        }
      }

      // 输出最终结果
      console.log(chalk.blueBright('任务完成，结果:'), JSON.stringify(summary, null, 2));
    } catch (err: any) {
      console.error(chalk.red('执行下载流程出错:'), err.message);
    }

    return summary;
  }

  private async postComment(dataHref: string): Promise<void> {
    const trackId = dataHref.match(/\d+/)?.[0];
    if (!trackId) throw new Error('无法解析帖子 ID');
    const url = `post-create-${trackId}-1.htm`;
    await this.http.post(
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
    const urls = Array.from(new Set(
      (html.match(/https?:\/\/[\w./?=&%-]+/g) || []).filter(u => u.includes('lanz')),
    ));
    const links = urls;
    if (links.length !== codes.length) {
      return { links: links.slice(-1), codes: codes.slice(-1) };
    }
    return { links, codes };
  }

  private async downloadFileWithProgress(url: string, filePath: string): Promise<void> {
    const { data, headers } = await this.http.get(url, { responseType: 'stream' });
    const total = Number(headers['content-length'] || 0);
    const bar = new ProgressBar(
      `${chalk.green('下载中')} [:bar] :percent :rate/bps :etas`,
      { total, width: 40 },
    );
    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      data.on('data', (chunk: Buffer) => bar.tick(chunk.length));
      data.pipe(writer);
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  }

  private async extractAudioFiles(zipPath: string, destDir: string): Promise<string[]> {
    if (!fs.existsSync(zipPath)) throw new Error('ZIP 文件不存在');

    const zip = new StreamZip.async({ file: zipPath, nameEncoding: 'gbk' });
    const entries = await zip.entries();
    const extracted: string[] = [];
    for (const name of Object.keys(entries)) {
      if (name.toLowerCase().endsWith('.flac')) {
        const out = path.join(destDir, path.basename(name));
        await zip.extract(name, out);
        extracted.push(out);
      }
    }
    await zip.close();
    return extracted;
  }

  /**
   * 如果直链返回的是 HTML 验证页，则自动提取参数并调用 ajax.php 拿到真正文件 URL
   */
  private async resolveVerification(directUrl: string): Promise<string> {
    // 1. 拉取页面，拿到 HTML
    const html = await this.http
      .get<string>(directUrl, { responseType: 'text' })
      .then(r => r.data);

    // 2. 如果不是 HTML 验证页，直接返回原 URL
    if (!html.includes('down_r(') || !html.includes('ajax.php')) {
      return directUrl;
    }

    // 3. 提取 el（down_r(1) 里的数字）
    const elMatch = html.match(/down_r\s*\(\s*(\d+)\s*\)/);
    const el = elMatch ? elMatch[1] : '1';

    // 4. 提取 file 和 sign
    const fileMatch = html.match(/['"]file['"]\s*:\s*['"]([^'"]+)['"]/);
    const signMatch = html.match(/['"]sign['"]\s*:\s*['"]([^'"]+)['"]/);
    if (!fileMatch || !signMatch) {
      throw new Error('无法提取验证参数');
    }
    const file = fileMatch[1];
    const sign = signMatch[1];

    // 5. 构造 ajax.php 地址并提交
    const ajaxUrl = new URL('ajax.php', directUrl).toString();
    const params = new URLSearchParams({ file, el, sign }).toString();
    const json = await this.http
      .post<{ zt: string; url: string }>(
        ajaxUrl,
        params,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          responseType: 'json',
        },
      )
      .then(r => r.data);

    if (json.zt !== '1' || !json.url) {
      throw new Error('验证失败，无法下载');
    }
    return json.url;
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


