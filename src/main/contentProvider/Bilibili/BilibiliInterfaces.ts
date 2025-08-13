/** B 站 VideoInfo 抽象（最小集：只保留我们用得到的字段） */
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
