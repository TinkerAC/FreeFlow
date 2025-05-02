export interface QQMusicTrackData {
  url: string;
}

export interface QQMusicTrackResponse {
  data: Data;
}

interface PlayUrlItem {
  url: string;
  error: boolean;
}

interface Data {
  playUrl: {
    [key: string]: PlayUrlItem; // 键名是动态的字符串
  };
}


// 定义 QQ 音乐接口返回数据的部分结构
export interface QQCloudSearchResponse {
  response: {
    code: number;
    data: {
      keyword: string;
      priority: number;
      qc: Array<{ text: string; type: number }>;
      semantic: { curnum: number; curpage: number; list: any[]; totalnum: number };
      song: {
        curnum: number;
        curpage: number;
        list: QQMusicTrack[];
      };
    };
  };
}

export interface QQMusicTrack {
  albumid: number;
  albummid: string;
  albumname: string;
  albumname_hilight: string;
  alertid: number;
  belongCD: number;
  cdIdx: number;
  chinesesinger: number;
  docid: string;
  grp: any[];
  interval: number;
  isonly: number;
  lyric: string;
  lyric_hilight: string;
  media_mid: string;
  msgid: number;
  newStatus: number;
  nt: number;
  pay: {
    payalbum: number;
    payalbumprice: number;
    paydownload: number;
    payinfo: number;
    payplay: number;
    paytrackmouth: number;
    paytrackprice: number;
  };
  preview: {
    trybegin: number;
    tryend: number;
    trysize: number;
  };
  pubtime: number;
  pure: number;
  singer: Array<{ id: number; mid: string; name: string; name_hilight: string }>;
  size128: number;
  size320: number;
  sizeape: number;
  sizeflac: number;
  sizeogg: number;
  songid: number;
  songmid: string;
  songname: string;
  songname_hilight: string;
  strMediaMid: string;
  stream: number;
  switch: number;
  t: number;
  tag: number;
  type: number;
  ver: number;
  vid: string;
}
