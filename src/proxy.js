import request from 'request'; // 使用 request 模块转发请求
import express from 'express';

import {getMusicLink} from './services/hifiniMusicService.js';
import path from 'path';
import {fileURLToPath} from 'url';
import {getDatabase} from "./utils/dbUtils.js";
import {isPortOccupied} from "./utils/netUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取环境变量中的 dataPath
const dataPath = process.env.DATA_PATH || path.join(__dirname, '..', 'data');
console.log('从主进程获取的 dataPath:', dataPath);

const dbPath = path.join(dataPath, 'database.sqlite');
console.log('代理进程数据库文件路径:', dbPath);
// 创建一个 Express 应用
const app = express();
let db = null;
db = await getDatabase(dbPath);
console.log('代理进程数据库已连接');


// 创建一个 GET 接口，接受客户端请求并转发到目标服务器
app.get('/proxy', async (req, res) => {
    const dataHref = req.query.dataHref; // 从请求中获取 dataHref 参数
    console.log('代理进程接收到请求，dataHref:', dataHref);
    try {
        const musicLink = await getMusicLink(dataHref, db); // 获取音乐链接
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
        // 使用request请求,并判断,正常则直接pipe到res,如果返回了-1,说明请求的资源不存在,需要更新未重定向的URL

        // 使用 request 模块转发请求，并将响应返回给客户端
        request(options).pipe(res);

    } catch (error) {
        console.error('Error fetching music link:', error.message);
        res.status(500).send('Error fetching music link.');
    }
});

let port = 3000;


let isPortInUse = await isPortOccupied(3000);

while (isPortInUse) {
    console.warn('端口 ' + port + ' 已被占用,尝试使用下一个端口');
    port++;
    isPortInUse = await isPortOccupied(port);
}


// 启动服务器,监听port端口
app.listen(port, () => {
    console.log('Proxy server listening on port ' + port);
});
