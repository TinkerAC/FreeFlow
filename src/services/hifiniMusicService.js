import axios from 'axios';
import {JSDOM} from 'jsdom';
import * as cheerio from 'cheerio';
import sqlite3 from 'sqlite3';
import path from 'path';
import {fileURLToPath} from "url";


// 数据库连接和辅助函数
let db;

const __filename = fileURLToPath(import.meta.url);  // 获取当前文件的路径
const __dirname = path.dirname(__filename);  // 获取当前文件所在的目录
const db_path = path.join(__dirname, "..", "..", "data", 'database.sqlite');  // 使用项目目录下的相对路径
console.log('数据库路径:', db_path);


// dbUtils
function getDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
        } else {
            db = new sqlite3.Database(db_path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    // 确保表存在
                    db.run(`CREATE TABLE IF NOT EXISTS hifini_info (
                        data_href TEXT PRIMARY KEY,
                        title TEXT,
                        artist TEXT,
                        cover_src TEXT,
                        un_redirected_url TEXT,
                        cached_at TIMESTAMP
                    )`, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(db);
                        }
                    });
                }
            });
        }
    });
}

function dbGet(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function dbRun(db, sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}


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
export async function getMusicLink(dataHref) {
    try {
        const db = await getDatabase();
        const row = await dbGet(db, 'SELECT un_redirected_url, cached_at FROM hifini_info WHERE data_href = ?', dataHref);

        let un_redirected_url;

        if (row) {
            const {un_redirected_url: cachedUrl, cached_at} = row;
            const currentDate = new Date().toISOString().split('T')[0];  // 获取当前日期（YYYY-MM-DD）

            if (cached_at && cached_at.startsWith(currentDate)) {  // 比较日期
                // 如果缓存日期是今天，使用缓存
                un_redirected_url = cachedUrl;
                console.log('使用缓存中的未重定向链接加载dataHref:', dataHref, '链接:', un_redirected_url);
            } else {
                // 如果缓存不是当天数据，重新抓取并保存
                const data = await fetchAndSaveMusicInfo(dataHref);
                un_redirected_url = data.un_redirected_url;
            }
        } else {
            // 如果数据库中没有记录，抓取并保存
            const data = await fetchAndSaveMusicInfo(dataHref);
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
export async function getMusicInfo(dataHref) {
    try {
        const db = await getDatabase();
        const row = await dbGet(db, 'SELECT title, artist, cover_src, cached_at FROM hifini_info WHERE data_href = ?', dataHref);

        if (row) {
            const {title, artist, cover_src, cached_at} = row;
            const currentDate = new Date().toISOString().split('T')[0];  // 获取当前日期（YYYY-MM-DD）

            if (cached_at && cached_at.startsWith(currentDate)) {  // 比较日期
                // 缓存是当天数据，直接使用缓存
                console.log("从数据库中获取有效缓存的音乐信息:", {data_href: dataHref, title, artist, cover_src});
                return {data_href: dataHref, title, artist, cover_src};
            } else {
                // 如果缓存不是当天数据，重新抓取并保存
                const data = await fetchAndSaveMusicInfo(dataHref);
                console.log("从数据库中获取过期缓存的音乐信息，已更新并保存:", {
                    data_href: dataHref,
                    title: data.title,
                    artist: data.artist,
                    cover_src: data.cover_src
                });
                return {data_href: dataHref, title: data.title, artist: data.artist, cover_src: data.cover_src};
            }
        } else {
            // 缓存中不存在数据，直接抓取
            const data = await fetchAndSaveMusicInfo(dataHref);
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
    }
}

// 抓取并保存音乐信息的辅助函数
async function fetchAndSaveMusicInfo(dataHref) {
    try {
        const db = await getDatabase();

        const html = await axios.get("https://hifini.com/" + dataHref, {
            headers: {referer: 'https://www.hifini.com'} // 添加请求头，模拟请求来源
        }).then(response => response.data); // `response.data` 包含 HTML 内容


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


// fetchAndSaveMusicInfo('thread-897.htm')