// file: src/main/proxyServer.ts

import express, { Application, Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { isPortOccupied } from '@src/utils/netUtils';
import HifiniMusicService from '@main/services/HifiniMusicService';
import NetEaseCloudMusicService from '@main/services/NetEaseCloudMusicService';
import axios from 'axios';
import { PassThrough } from 'stream';
import Store from 'electron-store';

@injectable()
class ProxyServerManager {
  private app: Application;
  private port: number;

  constructor(
    @inject('HifiniMusicService') private hifiniMusicService: HifiniMusicService,
    @inject('NetEaseCloudMusicService') private netEaseCloudMusicService: NetEaseCloudMusicService,
    @inject('Store') private store: Store,
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
    const cacheTime = this.store.get('cacheTime') || 86400; // 默认为1天
    console.log('代理服务器数据库已连接');

    this.app.get('/proxy', async (req: Request, res: Response) => {
      const platform = req.query.platform as string;
      const platformUniqueId = req.query.platformUniqueId as string;

      console.log('代理服务器收到请求:', platform, platformUniqueId);

      if (!platform || !platformUniqueId) {
        res.status(400).send('Error: Missing platform or platformUniqueId.');
        return;
      }

      try {
        const performRequest = async (forceReload = false): Promise<void> => {
          let musicLink: string | undefined;
          switch (platform) {
            case 'Hifini':
              musicLink = await this.hifiniMusicService.getMusicLink(platformUniqueId, forceReload);
              console.log(`Hifini music link${forceReload ? ' (forceReload)' : ''}:`, musicLink);
              break;
            case 'NetEaseCloudMusic':
              musicLink = await this.netEaseCloudMusicService.getNetEaseMusicLink(platformUniqueId);
              console.log(`NetEaseCloudMusic music link${forceReload ? ' (forceReload)' : ''}:`, musicLink);
              break;
            default:
              res.status(400).send('Error: Unsupported platform.');
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

          const contentType = response.headers['content-type'];
          if (contentType && contentType.startsWith('audio/')) {
            res.setHeader('Cache-Control', `public, max-age=${cacheTime}`);
            console.log(`请求返回的内容类型是音频文件，已为响应添加缓存头 ${cacheTime} 秒`);
          }

          const nodeHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(response.headers)) {
            nodeHeaders[key] = String(value);
          }

          const passThrough = new PassThrough();
          response.data.pipe(passThrough);

          let isFirstChunk = true;
          let headersSent = false;

          return new Promise<void>((resolve, reject) => {
            passThrough.on('data', (chunk: Buffer) => {
              if (isFirstChunk) {
                isFirstChunk = false;
                const chunkString = chunk.toString().trim();
                if (chunkString === '-1') {
                  console.log('返回内容为 "-1"，请求中止');
                  // 触发错误，让外层捕获并决定是否重试
                  passThrough.destroy(new Error('Received -1 from music link.'));
                  return;
                } else {
                  if (!headersSent) {
                    res.writeHead(response.status, nodeHeaders);
                    headersSent = true;
                  }
                }
              }
              res.write(chunk);
            });

            passThrough.on('end', () => {
              if (headersSent) {
                res.end();
              }
              resolve();
            });

            passThrough.on('error', (err: Error) => {
              reject(err);
            });
          });
        };

        // 首次尝试
        try {
          await performRequest(false);
        } catch (err: any) {
          // 如果是第一次出现 "-1" 错误，则forceReload重试
          if (err.message && err.message.includes('-1')) {
            console.log('检测到-1，使用 forceReload 重试...');
            try {
              await performRequest(true);
            } catch (secondErr: any) {
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

      } catch (error){
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