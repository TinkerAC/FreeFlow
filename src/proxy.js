import express from 'express';
import request from 'request'; // 引入 request 模块用于转发请求
import { getMusicLink } from './services/hifiniMusicService.js'; // 引入自定义的获取音乐链接服务

const app = express();

// 创建一个 GET 接口，接受客户端请求并转发到目标服务器
app.get('/proxy', async (req, res) => {
    const dataHref = req.query.dataHref; // 从请求中获取 dataHref 参数

    try {
        const musicLink = await getMusicLink(dataHref); // 获取音乐链接
        console.log('Music link:', musicLink);
        // 使用 request 模块转发请求并添加 Referer 头
        const options = {
            url: musicLink,
            headers: {}
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

// 启动服务器，监听 3000 端口
app.listen(3000, () => {
    console.log('Proxy server listening on port 3000');
});
