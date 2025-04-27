import express, { Application, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { isPortOccupied } from '@src/utils/netUtils';
import HifiniMusic from '@main/contentProvider/Hifini/HifiniMusic';
import NetEaseCloudMusic from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusic';
import axios from 'axios';
import { PassThrough } from 'stream';
import Store from 'electron-store';
import { QQMusic } from '@main/contentProvider/QQMusic/QQMusic';
import { FileCacheManager } from '@main/FileCacheManager';

@injectable()
class ProxyServerManager {
  private app: Application;
  private port: number;

  constructor(
    @inject('HifiniMusic') private hifiniMusic: HifiniMusic,
    @inject('NetEaseCloudMusic') private netEaseCloudMusic: NetEaseCloudMusic,
    @inject('QQMusic') private qqMusic: QQMusic,
    @inject('Store') private store: Store,
    @inject('FileCacheManager') private cacheManager: FileCacheManager, // 注入 FileCacheManager
  ) {
    this.app = express();
    this.port = 4399; // 默认端口

    // 添加全局 CORS 设置，允许所有来源的请求
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    });
  }

  public async start(): Promise<void> {
    console.log('代理服务器数据库已连接');

    this.app.get('/proxy', async (req: Request, res: Response) => {
      const platform = req.query.platform as string;
      const platformUniqueId = req.query.platformUniqueId as string;

      console.log('代理服务器收到请求:', platform, platformUniqueId);

      if (!platform || !platformUniqueId) {
        res.status(400).send('Error: Missing systemContext or platformUniqueId.');
        return;
      }

      // 使用平台名和唯一 ID 来生成缓存文件的 key
      const cacheKey = this.cacheManager.generateCacheKey(platform, platformUniqueId);

      // 使用 FileCacheManager 来查找缓存文件
      const cachedData = await this.cacheManager.getCachedFile(cacheKey);

      if (cachedData) {
        console.log(`${platform}-${platformUniqueId} 缓存命中，直接返回缓存数据`);
        res.setHeader('Content-Type', 'audio/mpeg'); // 根据实际情况设置 MIME 类型
        res.end(cachedData);
        return;
      }

      console.log(`${platform}-${platformUniqueId} 缓存未命中，开始请求数据`);

      try {
        const performRequest = async (forceReload = false): Promise<void> => {
          let musicLink: string | undefined;
          switch (platform) {
            case 'Hifini':
              musicLink = await this.hifiniMusic.getTrackLink(platformUniqueId, forceReload);
              console.log(`Hifini music link${forceReload ? ' (forceReload)' : ''}:`, musicLink);
              break;
            case 'NetEaseCloudMusic':
              musicLink = await this.netEaseCloudMusic.getTrackLink(platformUniqueId);
              console.log(`NetEaseCloudMusic music link${forceReload ? ' (forceReload)' : ''}:`, musicLink);
              break;

            case 'QQMusic':
              musicLink = await this.qqMusic.getTrackLink(platformUniqueId);
              break;
            default:
              res.status(400).send('Error: Unsupported systemContext.');
              return;
          }

          if (!musicLink) {
            res.status(404).send('Error: Music link not found.');
            return;
          }

          const headers: Record<string, string> = {};
          if (musicLink.includes('hifini')) {
            headers['Referer'] = 'https://hifini.com/';
          }

          // 发起请求获取音频流
          const response = await axios.get(musicLink, {
            responseType: 'stream',
            headers: headers,
          });

          const nodeHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers)) {
            nodeHeaders[key] = String(value);
          }

          const passThrough = new PassThrough();
          response.data.pipe(passThrough);

          const audioData: Buffer[] = []; // 用于存储音频流的缓存

          passThrough.on('data', (chunk: Buffer) => {
            audioData.push(chunk); // 累加音频数据
          });

          passThrough.on('end', async () => {
            if (audioData.length > 0) {
              const completeAudioData = Buffer.concat(audioData); // 合并所有音频数据

              // 缓存音频流到磁盘
              await this.cacheManager.cacheFile(cacheKey, completeAudioData); // 缓存当前音频文件
              res.setHeader('Content-Type', 'audio/mpeg'); // 设置 MIME 类型
              res.end(completeAudioData);
            }
          });

          passThrough.on('error', (err: Error) => {
            console.error('音频流错误:', err.message);
            res.status(500).send('Error processing music stream.');
          });
        };

        // 首次尝试
        try {
          await performRequest(false);
        } catch (err) {
          // 如果是第一次出现 "-1" 错误，则forceReload重试
          if (err.message && err.message.includes('-1')) {
            console.log('检测到-1，使用 forceReload 重试...');
            try {
              await performRequest(true);
            } catch (secondErr) {
              console.error('第二次重试仍然失败:', secondErr.message);
              if (!res.headersSent) {
                res.status(500).send('Error fetching music link after forced reload.');
              }
            }
          } else {
            console.error('Error fetching music link:', err.message);
            if (!res.headersSent) {
              res.status(500).send('Error fetching music link.');
            }
          }
        }

      } catch (error) {
        console.error('Error fetching music link:', error.message);
        if (!res.headersSent) {
          res.status(500).send('Error fetching music link.');
        }
      }
    });

    let isPortInUse = await isPortOccupied(this.port);
    while (isPortInUse) {
      console.warn(`端口 ${this.port} 已被占用，尝试使用下一个端口`);
      this.port++;
      isPortInUse = await isPortOccupied(this.port);
    }

    this.app.listen(this.port, () => {
      console.log(`代理服务器正在监听端口 ${this.port}`);
    });
  }
}

export default ProxyServerManager;