import { TrackModel } from '@src/shared/types';
import { injectable } from 'inversify';

@injectable()
export default class NetEaseCloudMusicService {
  private readonly base_url: string;

  constructor() {
    this.base_url = 'https://neteasecloudmusicapi-pi-flax.vercel.app/';
  }

  public async cloudSearch(keyword: string, type: number = 1, limit: number = 10, offset: number = 0,
  ): Promise<TrackModel[]> {
    interface CloudSearchResponse {
      result: {
        searchQcReminder: string;
        songs: NetEaseCloudMusicTrack[];
        songCount: number;
        code: number;
      };
    }

    const url = `${this.base_url}cloudsearch?keywords=${keyword}&type=${type}&limit=${limit}&offset=${offset}`;

    const response = await fetch(url);
    const data: CloudSearchResponse = await response.json();
    const songs = data.result.songs;



    const paidSongsCollection = songs.filter((song) => {
      return song.fee !== 0 && song.fee !== 8;
    });


    //过滤掉所有fee不是0或8的歌曲
    const freeSongsCollection = songs.filter((song) => {
      return song.fee === 0 || song.fee === 8;
    });

    console.log(`
网易云音乐搜索结果:
  付费歌曲: ${paidSongsCollection.length}首 (已过滤)
${paidSongsCollection.map((song) => `  - ${song.name}-${song.fee}`).join('\n')}
  免费歌曲: ${freeSongsCollection.length}首
${freeSongsCollection.map((song) => `  - ${song.name}-${song.fee}`).join('\n')}
`);

    return freeSongsCollection.map((song) => {
      return {
        platform: 'NetEaseCloudMusic',
        platform_unique_id: song.id.toString(),
        title: song.name,
        artist: song.ar.map((artist) => artist.name).join('/'),
        album: song.al.name,
        duration: song.dt / 1000,
        cover_src: song.al.picUrl,
        created_at: new Date(),
        fee: song.fee,
      };
    });

  }


  public async getNetEaseMusicLink(id: string): Promise<string> {

    interface NetEaseCloudMusicFreeTrialPrivilege {
      resConsumable: boolean;
      userConsumable: boolean;
      listenType: string | null;
      cannotListenReason: string | null;
      playReason: string | null;
      freeLimitTagType: string | null;
    }

    interface NetEaseCloudMusicFreeTimeTrialPrivilege {
      resConsumable: boolean;
      userConsumable: boolean;
      type: number;
      remainTime: number;
    }

    interface NetEaseCloudMusicTrackData {
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

    interface NetEaseCloudMusicTrackResponse {
      code: number;
      data: NetEaseCloudMusicTrackData[];
    }

    const url = `${this.base_url}song/url/v1?id=${id}&level=lossless&realIP=112.10.128.83`;


    const response: Response = await fetch(url);

    const data: NetEaseCloudMusicTrackResponse = await response.json();

    console.log(`网易云音乐歌曲链接详情:`, data);
    const trackData = data.data[0];

    console.log(`网易云音乐歌曲链接详情:`, trackData);

    return trackData.url;

  }

  private async checkAvailability(id: string): Promise<boolean> {
    interface CheckMusicResponse {
      success: boolean;
      message: string;
    }

    const url = `${this.base_url}check/music?id=${id}`;
    const response = await fetch(url);
    const data: CheckMusicResponse = await response.json();

    return data.success;
  }


}


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

export interface NetEaseCloudMusicFreeTrialPrivilege {
  resConsumable: boolean;
  userConsumable: boolean;
  listenType: string | null;
  cannotListenReason: string | null;
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

