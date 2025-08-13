// file: src/main/core/AudioProxyServer.ts
import express, { Application, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { isPortOccupied } from '@src/utils/netUtils';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { PassThrough } from 'stream';
import Store from 'electron-store';
import { FileCacheManager } from '@main/core/FileCacheManager';
import TrackRepository from '@main/database/repository/TrackRepository';
import fs from 'fs';
import path from 'path';
import { DataPath } from '@main/core/PathConfig';
import { DISymbol } from '@main/di/symbol';
import { BadRequestError } from '@main/core/exceptions/BadRequestError';
import { castToPlatform, Platform } from '@main/core/enum/Platform';
import Bilibili from '@main/contentProvider/Bilibili/Bilibili';

const DEFAULT_AUDIO_MIME = 'audio/mpeg';

@injectable()
class ProxyServerManager {
  private readonly app: Application;
  private port: number;

  constructor(
    @inject(DISymbol.HifiniMusic) private readonly hifiniMusic: HifiniMusic,
    @inject(DISymbol.NetEaseCloudMusic) private readonly netEaseCloudMusic: NetEaseCloudMusic,
    @inject(DISymbol.QQMusic) private readonly qqMusic: QQMusic,
    @inject(DISymbol.Store) private readonly store: Store,
    @inject(DISymbol.FileCacheManager) private readonly cacheManager: FileCacheManager,
    @inject(DISymbol.TrackRepository) private readonly trackRepository: TrackRepository,
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
    @inject(DISymbol.Bilibili) private readonly bilibili: Bilibili,
  ) {
    this.app = express();
    this.port = 4399;

    this.configureMiddlewares();
    this.setupRoutes();
  }

  /* -------------------------------------------------------------------------- */
  /*                                   Public                                   */

  /* -------------------------------------------------------------------------- */

  public async start(): Promise<void> {
    console.log('代理服务器数据库已连接');

    while (await isPortOccupied(this.port)) {
      console.warn(`端口 ${this.port} 已被占用，尝试使用下一个端口`);
      this.port++;
    }

    this.app.listen(this.port, () => {
      console.log(`代理服务器正在监听端口 ${this.port}`);
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                              Lifecycle Helpers                              */

  /* -------------------------------------------------------------------------- */

  private configureMiddlewares(): void {
    this.app.disable('x-powered-by');
// CORS 中间件：明确不返回 Response；记得 next()
    this.app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');
      next();
    });
  }

  private setupRoutes(): void {
    this.app.get('/proxy', (req, res) => void this.handleProxyRequest(req, res));
    this.app.head('/proxy', (req, res) => {
      // 简单健康检查/预检
      res.status(204).end();
    });
    // @ts-ignore
    this.app.get('/healthz', (_req, res) => res.status(200).send('ok'));
  }

  /* -------------------------------------------------------------------------- */
  /*                                 Route Logic                                 */

  /* -------------------------------------------------------------------------- */

  private async handleProxyRequest(req: Request, res: Response): Promise<void> {
    const { platform, platformUniqueId } = this.extractAndValidateParams(req);

    try {
      const platformEnum: Platform = castToPlatform(platform);

      console.log('代理服务器收到请求:', platform, platformUniqueId);

      // ---------- 1) 本地文件 ----------
      const localFilePath = await this.findLocalFile(platform, platformUniqueId);
      if (localFilePath) {
        console.log(`找到本地文件: ${localFilePath}`);
        await this.streamLocalFile(res, localFilePath, req);
        return;
      }

      // ---------- 2) 磁盘缓存 ----------
      const cacheKey = this.cacheManager.generateCacheKey(platform, platformUniqueId);
      const cachedData = await this.cacheManager.getCachedFile(cacheKey);

      // 如果客户端是 Range 请求并且命中缓存，支持 206 分段返回
      if (cachedData) {
        console.log(`${platform}-${platformUniqueId} 缓存命中`);
        await this.respondFromCacheBuffer(cachedData, req, res);
        return;
      }

      // ---------- 3) 远程拉取（边播边缓存；Range 请求仅转发不缓存） ----------
      console.log(`${platform}-${platformUniqueId} 缓存未命中，开始请求数据`);
      await this.fetchStreamAndMaybeCache(platformEnum, platformUniqueId, cacheKey, req, res);
    } catch (err: any) {
      const status =
        err instanceof BadRequestError
          ? err.status
          : (err?.response?.status as number) || 500;

      console.error('Proxy Error:', err?.message || err);
      if (!res.headersSent) res.status(status).send(err?.message || 'Proxy Error');
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                               Business Helpers                              */

  /* -------------------------------------------------------------------------- */

  private extractAndValidateParams(req: Request): { platform: string; platformUniqueId: string } {
    const platform = String(req.query.platform ?? '').trim();
    const platformUniqueId = String(req.query.platformUniqueId ?? '').trim();
    if (!platform || !platformUniqueId) {
      throw new BadRequestError('Missing platform or platformUniqueId.');
    }
    return { platform, platformUniqueId };
  }

  private async findLocalFile(platform: string, platformUniqueId: string): Promise<string | null> {
    const relativePath: string = await this.trackRepository.findLocalFilePathByPlatformAndPlatformUniqueId(
      platform,
      platformUniqueId,
    );
    if (!relativePath) return null;

    const absolutePath = path.join(this.dataPath.musicDir, relativePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
      return absolutePath;
    } catch {
      return null;
    }
  }

  private async streamLocalFile(res: Response, absolutePath: string, req: Request): Promise<void> {
    const stat = await fs.promises.stat(absolutePath);
    const total = stat.size;

    // 处理本地 Range
    const range = req.headers.range;
    if (range) {
      const { start, end } = this.parseRange(range, total);
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': DEFAULT_AUDIO_MIME,
      });
      fs.createReadStream(absolutePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': DEFAULT_AUDIO_MIME,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(absolutePath).pipe(res);
  }

  private async respondFromCacheBuffer(buffer: Buffer, req: Request, res: Response): Promise<void> {
    const total = buffer.length;
    const range = req.headers.range;

    if (range) {
      const { start, end } = this.parseRange(range, total);
      const chunk = buffer.subarray(start, end + 1);
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', String(chunk.length));
      res.setHeader('Content-Type', DEFAULT_AUDIO_MIME);
      res.end(chunk);
      return;
    }

    res.setHeader('Content-Type', DEFAULT_AUDIO_MIME);
    res.setHeader('Content-Length', String(total));
    res.setHeader('Accept-Ranges', 'bytes');
    res.end(buffer);
  }

  private parseRange(header: string, totalLength: number): { start: number; end: number } {
    // e.g. "bytes=12345-67890" / "bytes=12345-"
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match) return { start: 0, end: totalLength - 1 };
    let start = match[1] ? parseInt(match[1], 10) : 0;
    let end = match[2] ? parseInt(match[2], 10) : totalLength - 1;
    if (isNaN(start) || start < 0) start = 0;
    if (isNaN(end) || end >= totalLength) end = totalLength - 1;
    if (end < start) end = start;
    return { start, end };
  }

  /**
   * 从上游拉流并（在非 Range 请求时）边播边缓存；错误时处理 403 自动重试一次
   */
  private async fetchStreamAndMaybeCache(
    platform: Platform,
    platformUniqueId: string,
    cacheKey: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const isRange = Boolean(req.headers.range);

    // 拉取直链
    const getUpstream = async (): Promise<{ url: string; headers: Record<string, string> }> => {
      const musicLink = await this.getMusicLink(platform, platformUniqueId, false);
      if (!musicLink) throw new Error('Music link not found.');
      return { url: musicLink, headers: this.buildUpstreamHeaders(musicLink, req) };
    };

    // 第一次尝试
    let upstream = await getUpstream();
    let response: AxiosResponse<PassThrough>;
    try {
      response = await axios.get(upstream.url, {
        responseType: 'stream',
        headers: upstream.headers,
        // 让 3xx 也能取到数据（偶发的 CDN 跳转）
        validateStatus: (s) => s < 400,
      });
    } catch (e: any) {
      // 若错误是 403，尝试重新取一次直链再请求
      const status = e?.response?.status;
      if (status === 403) {
        console.warn('上游 403，尝试刷新直链后重试一次...');
        upstream = await getUpstream(); // 再取一次直链（若 Provider 内部带缓存，仍可能相同，但 Referer/UA 已修复基本不会再 403）
        response = await axios.get(upstream.url, {
          responseType: 'stream',
          headers: upstream.headers,
          validateStatus: (s) => s < 400,
        });
      } else if (String(e?.message || '').includes('-1')) {
        // 兼容 Hifini 的特殊返回码：-1，按你的原逻辑重取一次
        console.log('检测到 -1，重试直链获取...');
        upstream = await getUpstream();
        response = await axios.get(upstream.url, {
          responseType: 'stream',
          headers: upstream.headers,
          validateStatus: (s) => s < 400,
        });
      } else {
        throw e;
      }
    }

    // 透传关键响应头
    const mimeType = String(response.headers['content-type'] ?? DEFAULT_AUDIO_MIME);
    res.setHeader('Content-Type', mimeType);
    const passHeaders = ['content-length', 'content-range', 'accept-ranges'];
    passHeaders.forEach((k) => {
      const v = response.headers[k];
      if (v) res.setHeader(k, String(v));
    });

    // Range 请求：只转发，不缓存（因为拿到的是分片）
    if (isRange || String(response.status).startsWith('206')) {
      res.status(response.status);
      response.data.pipe(res);
      response.data.on('error', (err) => {
        console.error('上游音频流错误:', err?.message || err);
        if (!res.headersSent) res.status(502).end('Upstream stream error');
      });
      return;
    }

    // 非 Range：边播边缓存（内存 tee 一份）
    const chunks: Buffer[] = [];
    response.data.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      res.write(chunk);
    });
    response.data.on('end', async () => {
      try {
        const completeBuffer = Buffer.concat(chunks);
        await this.cacheManager.cacheFile(cacheKey, completeBuffer);
      } catch (err: any) {
        console.error('缓存写入失败:', err?.message || err);
        // 缓存失败不影响播放
      } finally {
        res.end();
      }
    });
    response.data.on('error', (err) => {
      console.error('上游音频流错误:', err?.message || err);
      if (!res.headersSent) res.status(502).end('Upstream stream error');
      else res.end();
    });
  }

  private buildUpstreamHeaders(musicLink: string, req: Request): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      Accept: '*/*',
      Connection: 'keep-alive',
    };

    // 透传 Range，支持边播边拖
    if (req.headers.range) headers['Range'] = String(req.headers.range);

    // B 站资源域需要 Referer/Origin
    if (/(bilivideo\.com|biliapi\.net|akamaized\.net|mcdn\.bilivideo\.(?:com|cn))/i.test(musicLink)) {
      headers['Referer'] = 'https://www.bilibili.com';
      headers['Origin'] = 'https://www.bilibili.com';
    } else if (/hifini\.com/i.test(musicLink)) {
      headers['Referer'] = 'https://hifini.com/';
    }

    return headers;
  }

  /**
   * 根据平台获取可用的直链。
   * 注意：这里暂不引入 forceReload 参数签名，重试策略在 fetchStreamAndMaybeCache 中实现。
   */
  private async getMusicLink(
    platform: Platform,
    platformUniqueId: string,
    _forceReload = false,
  ): Promise<string | undefined> {
    switch (platform) {
      case Platform.HIFINI:
        return this.hifiniMusic.getTrackLink(platformUniqueId, _forceReload);
      case Platform.NET_EASE_CLOUD_MUSIC:
        return this.netEaseCloudMusic.getTrackLink(platformUniqueId);
      case Platform.QQ_MUSIC:
        return this.qqMusic.getTrackLink(platformUniqueId);
      case Platform.BILIBILI:
        // 你的 Bilibili Provider 若后续支持 forceReload，可把第二个参数加上
        return this.bilibili.getTrackLink(platformUniqueId);
      default:
        throw new BadRequestError('Unsupported platform.');
    }
  }
}

export default ProxyServerManager;