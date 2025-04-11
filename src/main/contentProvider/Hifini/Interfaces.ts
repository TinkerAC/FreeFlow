// 定义 hifini_cookie 的类型，假定所有配置项均为字符串
export interface HifiniCookie {
  bbs_sid: string;
  bbs_token: string;

  [key: string]: string;
}


export interface HifiniSearchResult {
  dataHref: string;
  heat: number;
  title: string;
  isAlbum: number;
  formats: string[];
  isExpired: number;
}
