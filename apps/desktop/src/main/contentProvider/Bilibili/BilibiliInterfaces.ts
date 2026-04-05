/** B 站 VideoInfo 抽象 */
export interface BiliVideoInfo {
  bvid: string;
  title: string;
  desc?: string;
  cover: string; // pic
  owner: { name: string; mid: number };
  pages: Array<{ bvid: string; cid: number; part: string; duration: number }>;
}

export interface PlayUrl {
  audioUrl: string;
  mime: string;
  qualityId: number;
  codecs?: string;
  expireAt: number; // epoch ms
}

/** 关键字视频搜索返回项（归一化） */
export interface BiliSearchVideoItem {
  bvid: string;
  title: string;      // 已去掉<em>高亮
  author: string;
  duration: number;   // 秒
  cover: string;      // https
}
