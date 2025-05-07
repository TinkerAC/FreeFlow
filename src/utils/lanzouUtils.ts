/**
 * Lanzou Cloud Direct-Link Helper (TypeScript) – Axios版（修复 responseType）
 * ------------------------------------------------------
 * 使用 axios 重构的零依赖工具，直接返回可立即下载的 302 直链。
 * 修复：所有 HTTP 请求强制以文本形式返回，避免 Axios 自动解析成对象引发的 JSON.parse 错误。
 *
 * 安装依赖：
 *   npm install axios
 *
 * 用法示例：
 * ```ts
 * import { getLanzouDirectLink } from './lanzouUtils';
 *
 * (async () => {
 *   try {
 *     const url = await getLanzouDirectLink(
 *       'https://hifini.lanzn.com/iapHChv6y9c',
 *       'ad3e'            // 可选提取码
 *     );
 *     console.log('Download URL:', url);
 *   } catch (e) {
 *     console.error(e);
 *   }
 * })();
 * ```
 */

import type AxiosRequestHeaders from 'axios';
import axios from 'axios';

import { URLSearchParams } from 'url';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.121 Safari/537.36';

/**
 * 返回可直接下载的最终直链 URL。
 * @param rawLink Lanzou 分享链接
 * @param pwd 可选提取码
 * @param filenameSuffix 可选自定义后缀
 */
export async function getLanzouDirectLink(
  rawLink: string,
  pwd: string = '',
  filenameSuffix: string = '',
): Promise<string> {
  if (!rawLink) throw new Error('请输入URL');

  const shareUrl = normaliseUrl(rawLink);
  let html = await httpGet(shareUrl);

  if (html.includes('文件取消分享了')) {
    throw new Error('文件取消分享了');
  }

  // 密码保护分支
  if (html.includes('function down_p(){')) {
    if (!pwd) throw new Error('请输入分享密码');
    html = await handlePwdShare(html, pwd, shareUrl);
  } else {
    html = await handleNormalShare(html, shareUrl);
  }

  const data = JSON.parse(html);
  if (data.zt !== 1) {
    throw new Error(data.inf || '解析失败');
  }

  const downUrl1 = `${data.dom}/file/${data.url}`;
  const downUrl2 = await getFinalRedirect(downUrl1);
  let direct = downUrl2.startsWith('http') ? downUrl2 : downUrl1;

  if (filenameSuffix) {
    direct = direct.replace(/(.*?)\?fn=(.*?)\./, `$1${filenameSuffix}`);
  }
  // 清理 pid 参数
  direct = direct.replace(/pid=[^&]+&?/, '');

  return direct;
}

function normaliseUrl(raw: string): string {
  const parts = raw.split('.com/');
  return `https://www.lanzoup.com/${parts[1]}`;
}

async function httpGet(url: string, referer: string = ''): Promise<string> {
  const headers: AxiosRequestHeaders = {
    'User-Agent': USER_AGENT,
    'X-FORWARDED-FOR': randIP(),
    'CLIENT-IP': randIP(),
  };
  if (referer) headers.Referer = referer;

  const resp = await axios.get<string>(url, {
    headers,
    responseType: 'text',
  });
  return resp.data;
}

async function httpPost(
  url: string,
  data: Record<string, string>,
  referer: string = '',
): Promise<string> {
  const params = new URLSearchParams(data).toString();
  const headers: AxiosRequestHeaders = {
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-FORWARDED-FOR': randIP(),
    'CLIENT-IP': randIP(),
  };
  if (referer) headers.Referer = referer;

  const resp = await axios.post<string>(url, params, {
    headers,
    responseType: 'text',
  });
  return resp.data;
}

async function handlePwdShare(
  html: string,
  pwd: string,
  referer: string,
): Promise<string> {
  const [fullPath] = extractAll(html, /(ajaxm\.php\?file=\d+)/g);
  const sign = extractAll(html, /'sign':'(.*?)',/g)[1];

  const postData = {
    action: 'downprocess',
    sign,
    p: pwd,
    kd: '1',
  };
  const endpoint = `https://www.lanzoup.com/${fullPath}`;
  return httpPost(endpoint, postData, referer);
}

async function handleNormalShare(
  html: string,
  referer: string,
): Promise<string> {
  const m = html.match(/<iframe[^>]*?src="\/(.*?)"/);
  if (!m) throw new Error('未找到 iframe 链接');

  const iframeUrl = `https://www.lanzoup.com/${m[1]}`;
  const iframeHtml = await httpGet(iframeUrl, '');

  const [sign] = extractAll(iframeHtml, /wp_sign = '(.*?)'/g);
  const [signs] = extractAll(iframeHtml, /ajaxdata = '(.*?)'/g);
  const [fullPath] = extractAll(iframeHtml, /(ajaxm\.php\?file=\d+)/g);

  const postData = {
    action: 'downprocess',
    websignkey: signs,
    signs,
    sign,
    websign: '',
    kd: '1',
    ves: '1',
  };
  const endpoint = `https://www.lanzoup.com/${fullPath}`;
  return httpPost(endpoint, postData, iframeUrl);
}

async function getFinalRedirect(url: string): Promise<string> {
  const headers: AxiosRequestHeaders = {
    'User-Agent': USER_AGENT,
    Referer: 'https://developer.lanzoug.com',
    Cookie: 'down_ip=1; path=/; domain=.baidupan.com',
  };
  const resp = await axios.head(url, {
    headers,
    maxRedirects: 0,
    validateStatus: () => true,
    responseType: 'text',
  });
  return (resp.headers.location as string) || '';
}

function extractAll(str: string, re: RegExp): string[] {
  const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
  const globalRe = new RegExp(re.source, flags);
  return [...str.matchAll(globalRe)].map((m) => m[1]);
}

function randIP(): string {
  const rand = () => Math.floor(Math.random() * (255 - 60) + 60);
  const arr = [
    '218', '218', '66', '66', '218', '218', '60', '60', '202', '204', '66', '66', '66', '59', '61', '60', '222', '221', '66', '59', '60', '60', '66', '218', '218', '62', '63', '64', '66', '66', '122', '211',
  ];
  const a = arr[Math.floor(Math.random() * arr.length)];
  return `${a}.${rand()}.${rand()}.${rand()}`;
}

/* EOF */
// getLanzouDirectLink(
//   'https://hifini.lanzn.com/iapHChv6y9c',
//   'ad3e'
// ).then(console.log).catch(console.error);