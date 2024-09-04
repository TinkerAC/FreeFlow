import axios from 'axios';
import {JSDOM} from 'jsdom';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// 接受关键词并搜索，返回歌曲结果的 JSON 对象
async function search(keyword) {
    const extractLiElements = (html) => {
        const $ = cheerio.load(html);
        return $("div.card.search div.card-body ul li").toArray();
    };

    const parseLiElement = (liElement) => {
        const commonFormats = ['FLAC', 'MP3', 'WAV', 'AAC', 'ALAC', 'AIFF', 'DSD', 'APE', 'OGG', 'M4A', 'WMA'];
        const $li = cheerio.load(liElement);
        const dataHref = $li('li').attr('data-href');
        const title = $li('div.subject a').text();
        const isAlbum = title.includes('专辑') ? 1 : 0;
        const formats = commonFormats.filter(format => title.toUpperCase().includes(format));
        const isExpired = title.includes('失效') ? 1 : 0;
        const heat = parseInt($li('span.eye.comment-o.ml-2.hidden-sm.d-none').text().trim(), 10) || 0;

        return {dataHref, heat, title, isAlbum, formats, isExpired};
    };

    const searchUrl = `https://hifini.com/search-${encodeURIComponent(keyword)}-1.htm`;

    try {
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const liElements = extractLiElements(response.data);
        return liElements.map(parseLiElement);

    } catch (error) {
        console.error('Error fetching search results:', error);
        return [];
    }
}

// 获取重定向后的真实播放链接
async function getRedirectUrl(url) {
    try {
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {referer: 'https://www.hifini.com'}
        });
        return response.url;
    } catch (error) {
        console.error('Error in fetching redirect URL:', error);
        throw error;
    }
}

// Base32 编码函数
function base32Encode(str) {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = "", base32 = "";

    for (let i = 0; i < str.length; i++) {
        bits += str.charCodeAt(i).toString(2).padStart(8, '0');
    }

    bits = bits.padEnd(bits.length + (5 - bits.length % 5) % 5, '0');

    for (let i = 0; i < bits.length; i += 5) {
        base32 += base32chars[parseInt(bits.substring(i, i + 5), 2)];
    }

    return base32.padEnd(base32.length + (8 - base32.length % 8) % 8, '=')
        .replace(/=/g, 'HiFiNiYINYUECICHANG');
}

// 从网站源码中提取参数
function generateParam(data) {
    const key = '95wwwHiFiNicom27';
    let outText = '';

    for (let i = 0, j = 0; i < data.length; i++, j++) {
        if (j === key.length) j = 0;
        outText += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(j));
    }

    return base32Encode(outText);
}

// 获取音乐链接的函数
export async function getMusicLink(dataHref) {
    try {
        const html = await fetch("https://hifini.com/" + dataHref).then(res => res.text());
        const dom = new JSDOM(html);
        const scripts = dom.window.document.querySelectorAll('script');

        let scriptContent = '';
        for (let script of scripts) {
            if (script.textContent.includes('APlayer')) {
                scriptContent = script.textContent;
                break;
            }
        }

        if (scriptContent) {
            const musicMatch = scriptContent.match(/music:\s*\[(.*?)\]/s);
            if (!musicMatch) throw new Error('Music array not found in script.');

            const musicItems = musicMatch[1].match(/{[^}]+}/g);
            for (const item of musicItems) {
                const urlMatch = item.match(/url:\s*'([^']+)'/);
                if (urlMatch) {
                    let url = urlMatch[1];
                    const paramMatch = item.match(/generateParam\('([^']+)'\)/);
                    if (paramMatch) {
                        url += generateParam(paramMatch[1]);
                    }

                    if (!url.startsWith('http')) {
                        url = 'https://www.hifini.com/' + url;
                    }

                    return await getRedirectUrl(url);
                }
            }
        }

        throw new Error('未找到音乐链接');

    } catch (error) {
        console.error('Error getting music link:', error);
        throw error;
    }
}

// 获取音乐信息的函数
export async function getMusicInfo(dataHref) {
    try {
        const html = await fetch("https://hifini.com/" + dataHref).then(res => res.text());
        const dom = new JSDOM(html);
        const scripts = dom.window.document.querySelectorAll('script');

        let scriptContent = '';
        for (let script of scripts) {
            if (script.textContent.includes('APlayer')) {
                scriptContent = script.textContent;
                break;
            }
        }

        if (scriptContent) {
            const musicMatch = scriptContent.match(/music:\s*\[(.*?)\]/s);
            if (!musicMatch) throw new Error('Music array not found in script.');

            const musicItems = musicMatch[1].match(/{[^}]+}/g);
            for (const item of musicItems) {
                const titleMatch = item.match(/title:\s*'([^']+)'/);
                const authorMatch = item.match(/author:\s*'([^']+)'/);
                const picMatch = item.match(/pic:\s*'([^']+)'/);

                if (titleMatch && authorMatch && picMatch) {
                    return {
                        data_href: dataHref,
                        title: titleMatch[1],
                        artist: authorMatch[1],
                        cover_src: picMatch[1],
                    };
                }
            }
        }

        throw new Error('未找到音乐信息');

    } catch (error) {
        console.error('Error getting music info:', error);
        throw error;
    }
}

// 过滤、排序结果并获取音乐信息
export async function getSearchResults(keyword) {
    try {
        const searchResults = await search(keyword);
        if (!Array.isArray(searchResults) || searchResults.length === 0) {
            console.error('搜索结果不是有效的数组或为空');
            return [];
        }

        const filteredResults = searchResults
            .filter(result => result.isAlbum === 0)
            .sort((a, b) => b.heat - a.heat)
            .slice(0, 5);

        const musicInfos = await Promise.all(filteredResults.map(async (result) => {
            try {
                return await getMusicInfo(result.dataHref);
            } catch (error) {
                console.error(`获取音乐信息失败: ${error.message}`);
                return null;
            }
        }));

        return musicInfos.filter(info => info);

    } catch (error) {
        console.error('Error in getSearchResults:', error);
        return [];
    }
}

//
// //测试
// console.log(await search('周杰伦'));
//
// //测试
// console.log(await getMusicLink('thread-897.htm'));
//
// //测试
// console.log(await getMusicInfo('thread-897.htm'));