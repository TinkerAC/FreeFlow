// 建议新建一个文件，职责清晰
// file: src/main/network/bilibiliHeaders.ts
import { session, Session } from 'electron';

const BILI_URL_FILTER = {
  urls: [
    'https://*.bilivideo.com/*',
    'http://*.bilivideo.com/*',
    'https://*.bilibili.com/*',
    'http://*.bilibili.com/*',
    'https://*.biliapi.net/*',
    'http://*.biliapi.net/*',
  ],
};

function installHeadersForSession(ses: Session) {
  ses.webRequest.onBeforeSendHeaders(BILI_URL_FILTER, (details, cb) => {
    const h = details.requestHeaders;
    h['Referer'] = 'https://www.bilibili.com';
    h['User-Agent'] ??= 'Mozilla/5.0';
    cb({ requestHeaders: h });
  });
}

export function installBilibiliHeaders() {
  installHeadersForSession(session.defaultSession);
}

export function installBilibiliHeadersForNewSessions() {
  // 给之后创建的非默认 session 也安装
  // 使用处：app.on('session-created', installBilibiliHeadersForNewSessions)
  return (ses: Session) => installHeadersForSession(ses);
}