// proxyServer.js
import request from 'request'; // 使用 request 模块转发请求
import express from 'express';
import {getMusicLink} from './../services/hifiniMusicService.js';
import {isPortOccupied} from './../utils/netUtils.js';
import {Transform} from 'stream';

// 创建一个 Express 应用
const app = express();

// 启动代理服务器的函数
export async function startProxyServer(db, store) {
    // 从配置或环境变量中获取端口号
    let port = store.get('port') || 3000;
    let cacheTime = store.get('cacheTime') || 86400; // 缓存时间默认为 1 天q
    console.log('代理服务器数据库已连接');

    // 创建一个 GET 接口，接受客户端请求并转发到目标服务器
    app.get('/proxy', async (req, res) => {
        const dataHref = req.query.dataHref; // 从请求中获取 dataHref 参数
        console.log('代理服务器接收到请求，dataHref:', dataHref);
        try {
            const musicLink = await getMusicLink(dataHref, db, store); // 获取音乐链接
            console.log('Music link:', musicLink);

            // 使用 request 模块转发请求并添加 Referer 头
            const options = {
                url: musicLink,
                headers: {},
            };

            // 如果音乐链接包含 'hifini'，添加 Referer 头
            if (musicLink.includes('hifini')) {
                options.headers['Referer'] = 'https://www.hifini.com/';
            }

            // 发起请求
            const proxyRequest = request(options);

            // 创建一个 Transform 流来检查返回的数据
            let isFirstChunk = true;
            const checkResponseStream = new Transform({
                transform(chunk, encoding, callback) {
                    if (isFirstChunk) {
                        isFirstChunk = false;
                        const chunkString = chunk.toString();

                        if (chunkString.trim() === '-1') {
                            // 当返回内容为 "-1" 时抛出错误
                            res.status(500).send('Error: Received -1 from music link.');
                            proxyRequest.abort(); // 中止请求
                            callback(null);
                            console.log('返回内容为 "-1"，请求中止');
                            return;
                        } else {
                            // 获取内容类型
                            const contentType = proxyRequest.response.headers['content-type'];
                            // 如果是音频文件，添加缓存头，缓存1天
                            if (contentType && contentType.startsWith('audio/')) {
                                res.setHeader('Cache-Control', `public, max-age=${cacheTime}`);
                                console.log(`请求返回的内容类型是音频文件，已为响应添加缓存头${cacheTime}秒`);
                            }
                            // 将响应头发送给客户端
                            res.writeHead(proxyRequest.response.statusCode, proxyRequest.response.headers);
                        }
                    }
                    // 将数据写入响应
                    res.write(chunk);
                    callback(null);
                },
            });

            // 监听请求错误事件
            proxyRequest.on('error', function (err) {
                console.error('Error fetching music link:', err.message);
                res.status(500).send('Error fetching music link.');
            });

            // 监听请求结束事件
            proxyRequest.on('end', function () {
                res.end();
            });

            // 将请求管道通过 Transform 流，再到客户端响应
            proxyRequest.pipe(checkResponseStream);

        } catch (error) {
            console.error('Error fetching music link:', error.message);
            res.status(500).send('Error fetching music link.');
        }
    });

    // 检查端口是否被占用，如果是则递增端口号
    let isPortInUse = await isPortOccupied(port);

    while (isPortInUse) {
        console.warn('端口 ' + port + ' 已被占用，尝试使用下一个端口');
        port++;
        isPortInUse = await isPortOccupied(port);
    }

    // 启动服务器，监听可用的端口
    app.listen(port, () => {
        console.log('代理服务器正在监听端口 ' + port);
    });
}
