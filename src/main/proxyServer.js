// proxyServer.js
import request from 'request'; // 使用 request 模块转发请求
import express from 'express';
import {getMusicLink} from './../services/hifiniMusicService.js';
import path from 'path';
import {fileURLToPath} from 'url';
import {getDatabase} from './../utils/dbUtils.js';
import {isPortOccupied} from './../utils/netUtils.js';




// 创建一个 Express 应用
const app = express();

// 启动代理服务器的函数
export async function startProxyServer(db, store) {
    // 从配置或环境变量中获取端口号
    let port = store.get('port') || 3000;

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

            // 使用 request 模块转发请求，并将响应返回给客户端
            request(options).pipe(res);

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
