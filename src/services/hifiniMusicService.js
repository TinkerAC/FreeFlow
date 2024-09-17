import config from "config";
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


function isCommented(html) {
    // 如果字符串中含有 "alert-warning"，则返回 False，否则返回 True
    return !html.includes('alert-warning');
}

async function createComment(dataHref) {
    const trackNo = dataHref.match(/\d+/)[0];
    const url = `https://www.hifini.com/post-create-${trackNo}-1.htm`;

    const params = {
        doctype: 1,
        return_html: 1,
        quotepid: 0,
        message: '感谢分享'
    };

    const hifiniCookie = config.get('hifini_cookie');
    const cookie = `bbs_sid=${hifiniCookie.bbs_sid}; bbs_token=${hifiniCookie.bbs_token}`;

    try {
        const response = await axios.post(url, params, {
            headers: {
                'Cookie': cookie
            }
        });
        console.log('评论成功:', response.data);
    } catch (error) {
        console.error('评论失败:', error);
        throw new Error('评论请求失败');
    }
}

async function reloadAndCheckComment(dataHref) {
    // 从配置文件中获取 bbs_sid 和 bbs_token
    const hifiniCookie = config.get('hifini_cookie');
    const cookie = `bbs_sid=${hifiniCookie.bbs_sid}; bbs_token=${hifiniCookie.bbs_token}`;

    const url = `https://www.hifini.com/${dataHref}`;

    // 重新加载页面
    const response = await fetch(url, {
        headers: {
            'cookie': cookie
        }
    });

    // 解析新的 HTML 文本
    const $ = cheerio.load(await response.text());

    // 再次检查是否有评论
    if (!isCommented($.html())) {
        throw new Error('评论未成功，请检查');
    }
    console.log('评论已成功显示');
}

export async function parseNetDiskLink(dataHref) {
    // 从配置文件中获取 bbs_sid 和 bbs_token
    const hifiniCookie = config.get('hifini_cookie');
    console.log('hifiniCookie:', hifiniCookie);
    const cookie = `bbs_sid=${hifiniCookie.bbs_sid}; bbs_token=${hifiniCookie.bbs_token}`;

    const url = `https://www.hifini.com/${dataHref}`;

    const response = await fetch(url, {
        headers: {
            'cookie': cookie
        }
    });

    // 加载 HTML 文本
    const $ = cheerio.load(await response.text());
    // console.log('HTML:', $.html());
    // 检查是否有评论
    if (!isCommented($.html())) {
        console.log('未评论，开始评论');
        await createComment(dataHref);

        // 等待 3 秒后重新检查评论状态
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
            await reloadAndCheckComment(dataHref);
        } catch (error) {
            console.error('评论检查失败:', error);
            throw error;  // 抛出错误
        }
    } else {
        console.log('已存在评论');
    }

    // 调用 extractVisibleClasses 函数来获取可见的 class 名称
    const visibleClasses = extractVisibleClasses($);

    // 调用 extractCode 函数来提取 code
    const code = extractCode($, visibleClasses);

    // 定位到包含下载链接的元素 (用CSS选择器而非XPath)
    const linkElement = $('#body > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > div:nth-child(3)');

    // 提取链接
    const link = linkElement.find('a').attr('href');

    return {link, code};
}

/**
 * 提取 <style> 中 display:inline 的 class
 * @param {CheerioStatic} $ cheerio 实例
 * @returns {Array<string>} 返回可见的 class 名称列表
 */
function extractVisibleClasses($) {

    const targetDiv = $('.message.break-all')[0];

    if (targetDiv) {
        const firstStyle = targetDiv.children[0];
        const secondStyle = targetDiv.children[1];

        console.log(firstStyle);
        debugger;
        const extractClasses = (styleElement) => {
            if (!styleElement || !styleElement.innerHTML) {
                return [];
            }

            const text = styleElement.innerHTML;

            // 检查 'display:inline !important;' 是否存在
            if (!text.includes('{display:inline !important;}')) {
                return [];
            }

            // 根据 'display:inline !important;' 分割文本
            const visibleClass = text.split("{display:inline !important;}")[0];

            // 按逗号分割可见的类名并去除空白
            const list = visibleClass.split(",").map(item => item.trim());

            // 去掉每个类名前的点并返回结果
            return list.map(item => item.replace(".", "").trim()); // 返回清理后的类名列表
        };

        const firstStyles = extractClasses(firstStyle);
        const secondStyles = extractClasses(secondStyle);

        console.log('First Styles:', firstStyles);
        console.log('Second Styles:', secondStyles);
    } else {
        console.error('Target div not found.');
    }


    const styleContent = $('#body > div > div > div:nth-child(1) > div:nth-child(1) > div > div:nth-child(2) > style:nth-child(2)').html();

    // 正则表达式匹配 display:inline 的 class 名称
    const inlineClassPattern = /\.([a-zA-Z0-9_-]+)[^{]*\{[^}]*display\s*:\s*inline\s*!important\s*;/g;
    let match;
    const visibleClasses = [];

    // 遍历匹配结果并收集类名
    while ((match = inlineClassPattern.exec(styleContent)) !== null) {
        visibleClasses.push(match[1]);
    }
    return visibleClasses;  // 返回一个数组，包含所有可见的 class 名称
}

/**
 * 根据 visibleClasses 列表，按顺序提取对应类名的元素内容，并拼接成完整的 code
 * @param {CheerioStatic} $ cheerio 实例
 * @param {Array<string>} visibleClasses 可见的 class 名称列表
 * @returns {string} 拼接成的完整提取码
 */
function extractCode($, visibleClasses) {
    let code = '';

    // 遍历 visibleClasses 列表，按顺序提取每个类对应的元素内容
    visibleClasses.forEach(className => {
        // 查找对应的元素
        const element = $(`.${className}`);

        // 如果找到元素，提取内容并拼接
        if (element.length > 0) {
            const text = element.text().trim();
            if (text.length === 1) {
                code += text;  // 只会是一个字母或数字
            }
        }
    });

    return code;
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

// //测试获取网盘链接和提取码
// console.log(await parseNetDiskLink('thread-897.htm'));