// file: src/main/proxyServer.ts

import express, { Application, Request, Response } from 'express';
import { Transform } from 'stream';
import { inject, injectable } from 'inversify';
import axios from 'axios';
import { isPortOccupied } from '@src/utils/netUtils';
import HifiniMusicService from '@main/services/HifiniMusicService';

@injectable()
class ProxyServerManager {
  private app: Application;
  private port: number;

  constructor(
    @inject('HifiniMusicService') private hifiniMusicService: HifiniMusicService,
    @inject('Store') private store:any
  ) {
    this.app = express();
    this.port = 4399; // 默认端口
  }

  public async start(): Promise<void> {
    const cacheTime = this.store.get('cacheTime') || 86400; // 默认为1天
    console.log('代理服务器数据库已连接');

    this.app.get('/proxy', async (req: Request, res: Response) => {
      const dataHref = req.query.dataHref as string;
      console.log('代理服务器接收到请求，dataHref:', dataHref);

      try {
        // 获取音乐链接
        const musicLink = await this.hifiniMusicService.getMusicLink(dataHref);
        console.log('Music link:', musicLink);

        // 准备请求头
        const headers: Record<string, string> = {};
        if (musicLink.includes('hifini')) {
          headers['Referer'] = 'https://hifini.com/';
        }

        // 使用 axios 发起请求
        const response = await axios.get(musicLink, {
          responseType: 'stream',
          headers: headers,
        });

        const contentType = response.headers['content-type'];
        res.setHeader('Access-Control-Allow-Origin', '*'); // TODO: 临时解决跨域问题

        if (contentType && contentType.startsWith('audio/')) {
          res.setHeader('Cache-Control', `public, max-age=${cacheTime}`);
          console.log(`请求返回的内容类型是音频文件，已为响应添加缓存头 ${cacheTime} 秒`);
        }

        const nodeHeaders: Record<string, string> = {};

        for (const [key, value] of Object.entries(response.headers)) {
          // 确保 value 为 string 或 string[] 或 number，否则根据实际情况做相应转换
          nodeHeaders[key] = value as string;
        }

        res.writeHead(response.status, nodeHeaders);


        // 创建 Transform 流检查返回的第一个数据块
        let isFirstChunk = true;
        const checkResponseStream = new Transform({
          transform(chunk, encoding, callback) {
            if (isFirstChunk) {
              isFirstChunk = false;
              const chunkString = chunk.toString();
              if (chunkString.trim() === '-1') {
                res.status(500).send('Error: Received -1 from music link.');
                console.log('返回内容为 "-1"，请求中止');
                // 抛出错误以结束 Transform 流
                return callback(new Error('Received -1 from music link.'));
              }
            }
            callback(null, chunk);
          },
        });

        // 监听请求流的错误事件
        response.data.on('error', (err: Error) => {
          console.error('Error fetching music link:', err.message);
          if (!res.headersSent) {
            res.status(500).send('Error fetching music link.');
          } else {
            // 若部分数据已发送，只能结束响应
            res.end();
          }
        });

        // 将数据通过 Transform 流再输出给客户端
        response.data.pipe(checkResponseStream).pipe(res);

      } catch (error: any) {
        console.error('Error fetching music link:', error.message);
        res.status(500).send('Error fetching music link.');
      }
    });

    // 检查端口是否被占用，若被占用则递增尝试下一个端口
    let isPortInUse = await isPortOccupied(this.port);
    while (isPortInUse) {
      console.warn(`端口 ${this.port} 已被占用，尝试使用下一个端口`);
      this.port++;
      isPortInUse = await isPortOccupied(this.port);
    }

    // 启动服务器
    this.app.listen(this.port, () => {
      console.log(`代理服务器正在监听端口 ${this.port}`);
    });
  }
}

export default ProxyServerManager;
