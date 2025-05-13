export interface NetEaseCloudMusicArtist {
  id: number;
  name: string;
  tns: string[];
  alias: string[];
}

export interface NetEaseCloudMusicAlbum {
  id: number;
  name: string;
  picUrl: string;
  tns: string[];
  pic_str: string;
  pic: number;
}

export interface NetEaseCloudMusicAudioQuality {
  br: number;
  fid: number;
  size: number;
  vd: number;
  sr: number;
}

export interface NetEaseCloudMusicChargeInfo {
  rate: number;
  chargeUrl: string | null;
  chargeMessage: string | null;
  chargeType: number;
}


export interface NetEaseCloudMusicPrivilege {
  id: number;
  fee: number;
  payed: number;
  st: number;
  pl: number;
  dl: number;
  sp: number;
  cp: number;
  subp: number;
  cs: boolean;
  maxbr: number;
  fl: number;
  toast: boolean;
  flag: number;
  preSell: boolean;
  playMaxbr: number;
  downloadMaxbr: number;
  maxBrLevel: string;
  playMaxBrLevel: string;
  downloadMaxBrLevel: string;
  plLevel: string;
  dlLevel: string;
  flLevel: string;
  rscl: number | null;
  freeTrialPrivilege: NetEaseCloudMusicFreeTrialPrivilege;
  rightSource: number;
  chargeInfoList: NetEaseCloudMusicChargeInfo[];
}

export interface NetEaseCloudMusicTrack {
  name: string;
  id: number;
  pst: number;
  t: number;
  ar: NetEaseCloudMusicArtist[];
  alia: string[];
  pop: number;
  st: number;
  rt: string;
  fee: number;
  v: number;
  crbt: string | null;
  cf: string;
  al: NetEaseCloudMusicAlbum;
  dt: number;
  h: NetEaseCloudMusicAudioQuality | null;
  m: NetEaseCloudMusicAudioQuality | null;
  l: NetEaseCloudMusicAudioQuality | null;
  sq: NetEaseCloudMusicAudioQuality | null;
  hr: NetEaseCloudMusicAudioQuality | null;
  a: string | null;
  cd: string;
  no: number;
  rtUrl: string | null;
  ftype: number;
  rtUrls: string[];
  djId: number;
  copyright: number;
  s_id: number;
  mark: number;
  originCoverType: number;
  originSongSimpleData: string | null;
  tagPicList: string | null;
  resourceState: boolean;
  version: number;
  songJumpInfo: string | null;
  entertainmentTags: string | null;
  single: number;
  noCopyrightRcmd: string | null;
  rtype: number;
  rurl: string | null;
  mst: number;
  cp: number;
  mv: number;
  publishTime: number;
  privilege: NetEaseCloudMusicPrivilege;
}

export interface NetEaseCloudMusicPlaylist {
  id: number;
  name: string;
  coverImgUrl: string;
  creator: {
    nickname: string;
    userId: number;
    userType: number;
    avatarUrl: string | null;
    authStatus: number;
    expertTags: string[] | null;
    experts: string[] | null;
  };
  subscribed: boolean;
  trackCount: number;
  userId: number;
  playCount: number;
  bookCount: number;
  specialType: number;
  officialTags: string[] | null;
  action: string | null;
  actionType: string | null;
  recommendText: string | null;
  score: string | null;
  description: string;
  highQuality: boolean;
}


export interface CloudSearchResponse {
  result: {
    songs: Song[];
    playlists: NetEaseCloudMusicPlaylist[];
    playlistCount: number;
    code: number;
  };
}


export interface NetEaseCloudMusicFreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
  listenType: string | null;
  cannotListenReason: string | null;
  playReason: string | null;
  freeLimitTagType: string | null;
}

export interface NetEaseCloudMusicFreeTimeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
  type: number;
  remainTime: number;
}

export interface NetEaseCloudMusicTrackData {
  id: number;
  url: string;
  br: number;
  size: number;
  md5: string;
  code: number;
  expi: number;
  type: string;
  gain: number;
  peak: number;
  closedGain: number;
  closedPeak: number;
  fee: number;
  uf: string | null;
  payed: number;
  flag: number;
  canExtend: boolean;
  freeTrialInfo: string | null;
  level: string;
  encodeType: string;
  channelLayout: string | null;
  freeTrialPrivilege: NetEaseCloudMusicFreeTrialPrivilege;
  freeTimeTrialPrivilege: NetEaseCloudMusicFreeTimeTrialPrivilege;
  urlSource: number;
  rightSource: number;
  podcastCtrp: string | null;
  effectTypes: string | null;
  time: number;
  message: string | null;
  levelConfuse: string | null;
  musicId: string;
}

export interface NetEaseCloudMusicTrackResponse {
  code: number;
  data: NetEaseCloudMusicTrackData[];
}

export interface Song {
  name: string; // 歌曲名称
  id: number; // 歌曲 ID
  pst: number;
  t: number;
  ar: Artist[]; // 歌手信息
  alia: string[]; // 歌曲别名
  pop: number; // 热度
  st: number;
  rt: string; // 类型
  fee: number; // 费用类型
  v: number;
  crbt: any; // 彩铃信息
  cf: string;
  al: Album; // 专辑信息
  dt: number; // 歌曲时长（毫秒）
  h?: Quality; // 高质量音频信息
  m?: Quality; // 中质量音频信息
  l?: Quality; // 低质量音频信息
  sq?: Quality; // 超高质量音频信息
  hr?: unknown; // 无损音频信息
  a?: any;
  cd: string; // CD编号
  no: number; // 歌曲序号
  rtUrl?: string | null;
  ftype: number;
  rtUrls: string[];
  djId: number;
  copyright: number; // 版权信息
  s_id: number;
  mark: number;
  originCoverType: number;
  originSongSimpleData?: any;
  tagPicList?: any;
  resourceState: boolean;
  version: number;
  songJumpInfo?: any;
  entertainmentTags?: any;
  awardTags?: any;
  single: number;
  noCopyrightRcmd?: any;
  mv: number; // MV ID
  rtype: number;
  rurl?: string | null;
  mst: number;
  cp: number; // 版权公司
  publishTime: number; // 发布时间（时间戳）
  tns?: string[]; // 其他标题翻译
}

export interface Artist {
  id: number; // 歌手 ID
  name: string; // 歌手名称
  tns: string[]; // 翻译或别名
  alias: string[]; // 别名
}

export interface Album {
  id: number; // 专辑 ID
  name: string; // 专辑名称
  picUrl: string; // 专辑封面 URL
  tns: string[]; // 翻译或别名
  pic_str: string; // 封面图片字符串
  pic: number; // 封面图片 ID
}

export interface Quality {
  br: number; // 比特率（单位：bps）
  fid: number; // 文件 ID
  size: number; // 文件大小（单位：字节）
  vd: number; // 音质评分（负值越小越差）
  sr: number; // 采样率（单位：Hz）
}


export interface Result {
  code: number;
  songs: Song[];
}


export interface CheckMusicResponse {
  success: boolean;
  message: string;
}