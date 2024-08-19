import axios from 'axios';
import {JSDOM} from 'jsdom';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

//接受音乐thread的链接并返回qq音乐流媒体链接
async function parseMusicLink(html) {

    async function getRedirectUrl(url) {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
                referer: 'https://www.hifini.com'
            }
        });
        return response.url;
    }

    function base32Encode(str) {
        const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
        let bits = "";
        let base32 = "";

        // 将每个字符转换为二进制并拼接到 bits
        for (let i = 0; i < str.length; i++) {
            let bit = str.charCodeAt(i).toString(2).padStart(8, '0');
            bits += bit;
        }

        // 将 bits 填充到 5 的倍数
        bits = bits.padEnd(bits.length + (5 - bits.length % 5) % 5, '0');

        // 每 5 位转换为 base32 的一个字符
        for (let i = 0; i < bits.length; i += 5) {
            const chunk = bits.substring(i, i + 5);
            base32 += base32chars[parseInt(chunk, 2)];
        }

        // 将 base32 长度填充到 8 的倍数，并替换填充符
        return base32.padEnd(base32.length + (8 - base32.length % 8) % 8, '=')
            .replace(/=/g, 'HiFiNiYINYUECICHANG');
    }// 从网站源码中提取

    function generateParam(data) {
        const key = '95wwwHiFiNicom27';
        let outText = '';

        // 逐字符与 key 进行异或操作
        for (let i = 0, j = 0; i < data.length; i++, j++) {
            if (j === key.length) j = 0; // 如果 j 超出 key 的长度，则重置为 0
            outText += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(j));
        }

        return base32Encode(outText);
    }// 从网站源码中提取

    const dom = new JSDOM(html);
    const document = dom.window.document;

    let scriptContent = '';
    const scripts = document.querySelectorAll('script');

    // 查找包含 APlayer 配置的脚本
    for (let script of scripts) {
        if (script.textContent.includes('APlayer')) {
            scriptContent = script.textContent;
            break;
        }
    }

    if (scriptContent) {
        // 提取 music 数组的内容
        const musicMatch = scriptContent.match(/music:\s*\[(.*?)\]/s);
        if (!musicMatch) throw new Error('Music array not found in script.');

        const musicString = musicMatch[1];

        // 解析音乐 URL 和加密参数
        const urlMatch = musicString.match(/url:\s*'([^']+)'/);
        if (!urlMatch) throw new Error('Music URL not found.');

        let url = urlMatch[1];

        const paramMatch = musicString.match(/generateParam\('([^']+)'\)/);
        if (paramMatch) {
            const generatedParam = generateParam(paramMatch[1]);
            url += generatedParam;
        } else {
            console.error("无法解析 URL 的全部信息，因为 `generateParam` 是动态的或未知的。");
            return;
        }

        // 如果 URL 不以 http 开头，拼接基础 URL
        if (!url.startsWith('http')) {
            url = 'https://www.hifini.com/' + url;
        }

        // 获取重定向后的真实播放链接
        return await getRedirectUrl(url);
    } else {
        throw new Error('未找到音乐信息');
    }
}


// 获取音乐信息的主要函数
export async function getMusicInfo(link) {
    try {
        const response = await axios.get(link);
        return await parseMusicLink(response.data);
    } catch (error) {
        console.error('获取或解析音乐信息时出错:', error);
    }
}


// 接受关键词并搜索，返回歌曲结果的json对象
async function search(keyword) {

    // 接受thread主页的html并返回其中的li元素列表
    function extractLiElements(html) {
        const $ = cheerio.load(html);

        // 模拟 Python 中的 soup.find 的行为，查找目标 li 列表
        return $("div.card.search")
            .find("div.card-body")
            .find("ul")
            .find("li")
            .toArray();
    }

    // 解析li元素,返回json对象
    function parseLiElement(liElement) {
        const commonFormats = ['FLAC', 'MP3', 'WAV', 'AAC', 'ALAC', 'AIFF', 'DSD', 'APE', 'OGG', 'M4A', 'WMA'];

        const $li = cheerio.load(liElement);
        const dataHref = $li('li').attr('data-href');
        const titleTag = $li('div.subject a');
        const title = titleTag.text();

        const isAlbum = title.includes('专辑') ? 1 : 0;
        const formats = commonFormats.filter(format => title.toUpperCase().includes(format));
        const isExpired = title.includes('失效') ? 1 : 0;

        const heatTag = $li('span.eye.comment-o.ml-2.hidden-sm.d-none');
        const heat = heatTag.length ? parseInt(heatTag.text().trim(), 10) : 0;

        return {
            dataHref,
            heat,
            title,
            isAlbum,
            formats,
            isExpired
        };
    }

    const encodedTerm = encodeURIComponent(keyword);
    const searchUrl = `https://hifini.com/search-${encodedTerm}-1.htm`;

    try {
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const liElements = extractLiElements(response.data);
        return liElements.map(li => parseLiElement(li));

    } catch (error) {
        console.error('Error fetching search results:', error);
        return [];
    }
}


(async () => {
    const results = await search('七里香');
    console.log(results);
})();


