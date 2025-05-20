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
import { music_Dir } from '@main/core/pathConfig';
import { DISymbol } from '@main/di/symbol';
import { BadRequestError } from '@main/core/exceptions/BadLoadAudio';
import { castToPlatform, Platform } from '@main/core/enum/Platform';

/**
 * 统一的音频 MIME Type 兜底
 */
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
  ) {
    this.app = express();
    this.port = 4399; // 默认端口

    this.configureMiddlewares();
    this.setupRoutes();
  }

  /* -------------------------------------------------------------------------- */
  /*                                Public API                                  */

  /* -------------------------------------------------------------------------- */
  /**
   * 启动代理服务器。
   */
  public async start(): Promise<void> {
    console.log('代理服务器数据库已连接');

    // 动态探测可用端口
    while (await isPortOccupied(this.port)) {
      console.warn(`端口 ${this.port} 已被占用，尝试使用下一个端口`);
      this.port++;
    }

    this.app.listen(this.port, () => {
      console.log(`代理服务器正在监听端口 ${this.port}`);
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                             Lifecycle Helpers                              */

  /* -------------------------------------------------------------------------- */
  /**
   * 设置 CORS / JSON 等全局中间件。
   */
  private configureMiddlewares(): void {
    // 允许所有来源访问，避免跨域问题
    this.app.use((_req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
  }

  /**
   * 注册所有 HTTP 路由。
   */
  private setupRoutes(): void {
    this.app.get('/proxy', (req, res) => void this.handleProxyRequest(req, res));
  }

  /* -------------------------------------------------------------------------- */
  /*                                Route Logic                                 */

  /* -------------------------------------------------------------------------- */
  /**
   * 统一处理 /proxy 请求
   */
  private async handleProxyRequest(req: Request, res: Response): Promise<void> {
    const { platform, platformUniqueId } = this.extractAndValidateParams(req);

    try {

      //将收到的platform 转为 Platform 枚举
      const platformEnum: Platform = castToPlatform(platform);

      console.log('代理服务器收到请求:', platform, platformUniqueId);

      /* ---------- 1. 本地文件优先 ---------- */
      const localFilePath = await this.findLocalFile(platform, platformUniqueId);
      if (localFilePath) {
        console.log(`找到本地文件: ${localFilePath}`);
        await this.streamLocalFile(res, localFilePath);
        return;
      }

      /* ---------- 2. 磁盘缓存 ---------- */
      const cacheKey = this.cacheManager.generateCacheKey(platform, platformUniqueId);
      const cachedData = await this.cacheManager.getCachedFile(cacheKey);
      if (cachedData) {
        console.log(`${platform}-${platformUniqueId} 缓存命中，直接返回缓存数据`);
        this.sendBuffer(res, cachedData, DEFAULT_AUDIO_MIME);
        return;
      }

      /* ---------- 3. 远程拉取 & 缓存 ---------- */
      console.log(`${platform}-${platformUniqueId} 缓存未命中，开始请求数据`);
      await this.fetchStreamAndCache(platformEnum, platformUniqueId, cacheKey, res);
    } catch (err) {
      const status = err instanceof BadRequestError ? err.status : 500;
      console.error('Proxy Error:', err.message);
      if (!res.headersSent) res.status(status).send(err.message);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              Business Helpers                              */

  /* -------------------------------------------------------------------------- */
  /**
   * 提取并校验 query 参数。
   */
  private extractAndValidateParams(req: Request): { platform: string; platformUniqueId: string } {
    const platform = String(req.query.platform ?? '').trim();
    const platformUniqueId = String(req.query.platformUniqueId ?? '').trim();
    if (!platform || !platformUniqueId) {
      throw new BadRequestError('Missing platform or platformUniqueId.');
    }
    return { platform, platformUniqueId };
  }

  /**
   * 查询 TrackRepository 并判定本地文件是否存在。
   */
  private async findLocalFile(platform: string, platformUniqueId: string): Promise<string | null> {
    const relativePath: string = await this.trackRepository.findLocalFilePathByPlatformAndPlatformUniqueId(platform, platformUniqueId);
    if (!relativePath) return null;

    const absolutePath = path.join(music_Dir, relativePath);
    try {
      await fs.promises.access(absolutePath, fs.constants.R_OK);
      return absolutePath;
    } catch (_) {
      return null;
    }
  }

  /**
   * 将本地文件以流形式返回给客户端。
   */
  private async streamLocalFile(res: Response, absolutePath: string): Promise<void> {
    const stat = await fs.promises.stat(absolutePath);
    res.writeHead(200, {
      'Content-Type': DEFAULT_AUDIO_MIME, // 若想精准类型可用 mime 包，根据扩展名推断
      'Content-Length': stat.size,
    });

    const readStream = fs.createReadStream(absolutePath);
    readStream.pipe(res);

    readStream.on('error', (err) => {
      console.error('读取本地文件错误:', err.message);
      if (!res.headersSent) res.status(500).end('Error reading local file');
    });
  }

  /**
   * 从缓存中命中后直接输出 Buffer
   */
  private sendBuffer(res: Response, data: Buffer, mime: string): void {
    res.setHeader('Content-Type', mime);
    res.end(data);
  }

  /**
   * 远程拉取音频流并保存到缓存。
   * 如果遇到返回码 "-1" 的特殊情况，则自动 forceReload 再尝试一次。
   */
  private async fetchStreamAndCache(
    platform: Platform,
    platformUniqueId: string,
    cacheKey: string,
    res: Response,
  ): Promise<void> {
    const tryFetch = async (forceReload: boolean): Promise<AxiosResponse<PassThrough>> => {
      const musicLink = await this.getMusicLink(platform, platformUniqueId, forceReload);
      if (!musicLink) throw new Error('Music link not found.');

      const headers: Record<string, string> = musicLink.includes('hifini') ? { Referer: 'https://hifini.com/' } : {};
      return axios.get(musicLink, { responseType: 'stream', headers });
    };

    let response: AxiosResponse<PassThrough> | null = null;

    try {
      response = await tryFetch(false);
    } catch (err) {
      // 若后端返回码 -1（多见于 Hifini），重试一次
      if (err.message?.includes('-1')) {
        console.log('检测到 -1，使用 forceReload 重试...');
        response = await tryFetch(true);
      } else {
        throw err;
      }
    }

    // response 一定有值
    const mimeType = String(response.headers['content-type'] ?? DEFAULT_AUDIO_MIME);
    const passThrough = new PassThrough();
    response.data.pipe(passThrough);

    const chunks: Buffer[] = [];
    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk));

    passThrough.on('end', async () => {
      try {
        const completeBuffer = Buffer.concat(chunks);
        await this.cacheManager.cacheFile(cacheKey, completeBuffer);
        this.sendBuffer(res, completeBuffer, mimeType);
      } catch (err) {
        console.error('缓存写入失败:', err.message);
        if (!res.headersSent) res.status(500).send('Error writing cache');
      }
    });

    passThrough.on('error', (err) => {
      console.error('音频流错误:', err.message);
      if (!res.headersSent) res.status(500).send('Error processing music stream');
    });
  }

  /**
   * 根据平台获取可用的直链。部分平台支持 forceReload。
   */
  private async getMusicLink(
    platform: Platform,
    platformUniqueId: string,
    forceReload = false,
  ): Promise<string | undefined> {
    switch (platform) {
      case Platform.HIFINI:
        return this.hifiniMusic.getTrackLink(platformUniqueId, forceReload);
      case Platform.NET_EASE_CLOUD_MUSIC:
        return this.netEaseCloudMusic.getTrackLink(platformUniqueId);
      case Platform.QQ_MUSIC:
        return this.qqMusic.getTrackLink(platformUniqueId);
      default:
        throw new BadRequestError('Unsupported platform.');
    }
  }
}

export default ProxyServerManager;
