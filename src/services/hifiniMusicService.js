import axios from 'axios';
import {JSDOM} from 'jsdom';
import * as cheerio from 'cheerio';
import {dbGet, dbRun, getDatabase} from '../utils/dbUtils.js';
import {getRandom} from 'random-useragent';
import path from "path";
import {fileURLToPath} from "url";


// 获取环境变量中的 dataPath


// 获取当前模块的文件名
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块的目录名
const __dirname = path.dirname(__filename);

// console.log('sqlite3:', path.join(__dirname, '..','..', 'data', 'database.sqlite'));

// 数据库连接和辅助函数


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
                'User-Agent': getRandom(),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Connection': 'keep-alive',
                'DNT': '1', // 防止部分爬虫检测
                'Upgrade-Insecure-Requests': '1',
                "bbs_sid": "o85cgb08s953nl5j6svv907tvu",
                "bbs_token": "IIz1_2B5G44mUlrX3GvpJJEs1_2F_2FYAMJ3rpOnu7G97O147AcdoMAvp_2BMn0TBRVrfJk7pXdsOevjoPHuEVNleJSvGh2d17Y_3D"
            },
            timeout: 10000 // 设置超时时间10秒
        });

        const liElements = extractLiElements(response.data);
        return liElements.map(parseLiElement);

    } catch (error) {
        // 检查是否是超时错误
        if (error.code === 'ECONNABORTED') {
            console.error('搜索超时:', error.message);
        } else {
            console.error('搜索出错:', error);
        }
        return [];
    }

}

// 获取重定向后的真实播放链接
async function getRedirectUrl(url) {
    try {
        const response = await axios.head(url, {
            headers: {referer: 'https://www.hifini.com'},
            maxRedirects: 5 // 设置为你想要的重定向次数限制
        });
        return response.request.res.responseUrl; // 获取最终重定向后的 URL
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
export async function getMusicLink(dataHref, db) {
    try {
        const row = await dbGet(db, 'SELECT un_redirected_url, cached_at FROM hifini_info WHERE data_href = ?', dataHref);
        let un_redirected_url;

        if (row) {
            const {un_redirected_url: cachedUrl, cached_at} = row;
            const currentDate = new Date().toISOString().split('T')[0];

            if (cached_at && cached_at.startsWith(currentDate)) {
                un_redirected_url = cachedUrl;
                console.log('使用缓存中的未重定向链接加载dataHref:', dataHref, '链接:', un_redirected_url);
            } else {
                const data = await fetchAndSaveMusicInfo(dataHref, db);
                un_redirected_url = data.un_redirected_url;
            }
        } else {
            const data = await fetchAndSaveMusicInfo(dataHref, db);
            un_redirected_url = data.un_redirected_url;

        }

        const final_url = await getRedirectUrl(un_redirected_url);
        console.log('重定向后的链接:', final_url);
        return final_url;

    } catch (error) {
        console.error('Error getting music link:', error);
        throw error;
    }
}

// 获取音乐信息的函数
export async function getMusicInfo(dataHref, db) {

    try {
        const row = await dbGet(db, 'SELECT title, artist, cover_src, cached_at FROM hifini_info WHERE data_href = ?', dataHref);
        if (row) {
            const {title, artist, cover_src, cached_at} = row;
            return {data_href: dataHref, title, artist, cover_src};

        } else {
            const data = await fetchAndSaveMusicInfo(dataHref, db);
            console.log("缓存中不存在音乐信息，已获取并保存:", {
                data_href: dataHref,
                title: data.title,
                artist: data.artist,
                cover_src: data.cover_src
            });
            return {data_href: dataHref, title: data.title, artist: data.artist, cover_src: data.cover_src};
        }

    } catch (error) {
        console.error('Error getting music info:', error);
        throw error;
    } finally {
        // db.close();
    }
}

// 抓取并保存音乐信息的辅助函数
async function fetchAndSaveMusicInfo(dataHref, db) {

    const cookies = {
        "bbs_sid": "96ua2fkhk0r2e2eb7khsn4f15g",
        "bbs_token": "kiceFZBMuXi0zyDiXXQ9rnaZJ5kJe0f5V18lgcV5VzJanHEFwm5i_2FXTilTsG5gcbhkrX3_2B_2FTWpJ7rSyYPng1IWNPae4ObKlb"
    }
    try {
        const cookieString =
            Object.entries(cookies)
                .map(([key, value]) => `${key}=${value}`)
        const html = await axios.get("https://hifini.com/" + dataHref, {
            headers: {
                referer: 'https://www.hifini.com',
                cookie: cookieString,
            },
        }).then(response => response.data);

        const dom = new JSDOM(html);
        const scripts = dom.window.document.querySelectorAll('script');

        let scriptContent = '';
        for (let script of scripts) {
            if (script.textContent.includes('APlayer')) {
                scriptContent = script.textContent;
                break;
            }
        }
        //如果有"APlayer"的脚本内容(页面上有外链的音乐播放器)
        if (scriptContent) {
            const musicMatch = scriptContent.match(/music:\s*\[(.*?)\]/s);
            if (!musicMatch) throw new Error('Music array not found in script.');

            const musicItems = musicMatch[1].match(/{[^}]+}/g);
            for (const item of musicItems) {
                const titleMatch = item.match(/title:\s*'([^']+)'/);
                const authorMatch = item.match(/author:\s*'([^']+)'/);
                const picMatch = item.match(/pic:\s*'([^']+)'/);
                const urlMatch = item.match(/url:\s*'([^']+)'/);

                if (titleMatch && authorMatch && picMatch && urlMatch) {
                    let url = urlMatch[1];
                    const paramMatch = item.match(/generateParam\('([^']+)'\)/);
                    if (paramMatch) {
                        url += generateParam(paramMatch[1]);
                    }

                    if (!url.startsWith('http')) {
                        url = 'https://www.hifini.com/' + url;
                    }

                    const title = titleMatch[1];
                    const artist = authorMatch[1];
                    const cover_src = picMatch[1];
                    const un_redirected_url = url;

                    // 检查数据是否存在
                    const row = await dbGet(db, 'SELECT * FROM hifini_info WHERE data_href = ?', dataHref);

                    if (row) {
                        // 如果存在，执行 UPDATE
                        await dbRun(db, `
                            UPDATE hifini_info 
                            SET title = ?, artist = ?, cover_src = ?, un_redirected_url = ?, cached_at = CURRENT_TIMESTAMP 
                            WHERE data_href = ?`,
                            [title, artist, cover_src, un_redirected_url, dataHref]
                        );
                    } else {
                        // 如果不存在，执行 INSERT
                        await dbRun(db, `
                            INSERT INTO hifini_info (data_href, title, artist, cover_src, un_redirected_url, cached_at) 
                            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                            [dataHref, title, artist, cover_src, un_redirected_url]
                        );
                    }

                    return {data_href: dataHref, title, artist, cover_src, un_redirected_url};
                }
            }
        }

    } catch (error) {
        console.error('Error fetching and saving music info:', error);
        throw error;
    }
}

// 过滤、排序结果并获取音乐信息
export async function getSearchResults(keyword, db) {
    try {
        console.log("主进程正在执行搜索操作，关键词:", keyword);

        // 执行搜索操作并记录结果数量
        const searchResults = await search(keyword);
        console.info(`搜索操作完成，结果数量: ${searchResults ? searchResults.length : 0}`);

        // 检查搜索结果是否有效
        if (!Array.isArray(searchResults) || searchResults.length === 0) {
            console.warn('搜索结果不是有效的数组或为空，返回空数组');
            return [];
        }

        // 过滤非专辑结果并按热度排序
        const filteredResults = searchResults
            .filter(result => result.isAlbum === 0);
        console.info(`过滤后结果数量: ${filteredResults.length}`);

        if (filteredResults.length === 0) {
            console.warn('过滤后的结果为空，返回空数组');
            return [];
        }

        // 按热度排序并截取前5个
        const sortedResults = filteredResults
            .sort((a, b) => b.heat - a.heat)
            .slice(0, 5);
        console.info(`排序并截取前5个结果，准备获取详细信息`);

        // 获取每个结果的详细信息
        const musicInfos = await Promise.all(sortedResults.map(async (result, index) => {
            try {
                console.log(`正在获取第 ${index + 1} 个结果的音乐信息，链接: ${result.dataHref}`);
                const musicInfo = await getMusicInfo(result.dataHref, db);
                console.info(`第 ${index + 1} 个结果的音乐信息获取成功`);
                return musicInfo;

            } catch (error) {
                console.log(`未在${result.dataHref}中找到可播放的音乐`);
                return null;
            }
        }));

        // 过滤掉获取失败的音乐信息
        const validMusicInfos = musicInfos.filter(info => info);
        console.info(`成功获取到 ${validMusicInfos.length} 个有效的音乐信息`);

        return validMusicInfos;

    } catch (error) {
        console.error('getSearchResults 函数执行出错:', error);
        return [];
    }
}


//
// 示例调用
// getSearchResults('北京欢迎你', await getDatabase("D:\\Workplace\\NodeProject\\Spotify\\data\\database.sqlite")).then(console.log)


// fetchAndSaveMusicInfo(
//     "thread-22709.htm",
//     await getDatabase(path.join(__dirname, '..', '..', 'data', 'database.sqlite'))
// ).then(console.log);
