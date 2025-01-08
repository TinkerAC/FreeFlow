import { NetEaseCloudMusicTrackModel, PlaylistModel, TrackModel } from '@src/shared/types';
import { injectable } from 'inversify';
import { Platform } from '@main/enum/Platform';

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
      return NetEaseCloudMusicTrackModel.build({
        platform: 'NetEaseCloudMusic',
        platform_unique_id: song.id.toString(),
        title: song.name,
        artist: song.ar.map((artist) => artist.name).join('/'),
        album: song.al.name,
        duration: song.dt / 1000,
        cover_src: song.al.picUrl,
        created_at: new Date(),
        fee: song.fee,
      });
    });

  }


  //todo: merge the two functions below
  public async cloudSearchPlaylist(keyword: string, type: number = 1000, limit: number = 10, offset: number = 0): Promise<PlaylistModel[]> {


    interface NetEaseCloudMusicPlaylist {
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


    interface CloudSearchResponse {
      result: {
        playlists: NetEaseCloudMusicPlaylist[];
        playlistCount: number;
        code: number;
      };
    }


    const url = `${this.base_url}cloudsearch?keywords=${keyword}&type=${type}&limit=${limit}&offset=${offset}`;

    const response = await fetch(url);
    const data: CloudSearchResponse = await response.json();
    const playlists = data.result.playlists;


    return playlists.map((playlist) => {
      return PlaylistModel.build({
        playlist_id: playlist.id,
        title: playlist.name,
        description: playlist.description,
        created_at: new Date(),
        creator: playlist.creator.nickname,
        modified_at: new Date(),
        cover_src: playlist.coverImgUrl,
        platform: Platform.NET_EASE_CLOUD_MUSIC,
        platform_unique_id: playlist.id.toString(),
      });
    });
  };


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


  public async getPlaylistDetail(playlist_id: string, limit: number = 1000, offset: number = 0,
  ): Promise<PlaylistModel> {

    interface Song {
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
      crbt: never; // 彩铃信息
      cf: string;
      al: Album; // 专辑信息
      dt: number; // 歌曲时长（毫秒）
      h?: Quality; // 高质量音频信息
      m?: Quality; // 中质量音频信息
      l?: Quality; // 低质量音频信息
      sq?: Quality; // 超高质量音频信息
      hr?: unknown; // 无损音频信息
      a?: never;
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
      originSongSimpleData?: never;
      tagPicList?: never;
      resourceState: boolean;
      version: number;
      songJumpInfo?: never;
      entertainmentTags?: never;
      awardTags?: never;
      single: number;
      noCopyrightRcmd?: never;
      mv: number; // MV ID
      rtype: number;
      rurl?: string | null;
      mst: number;
      cp: number; // 版权公司
      publishTime: number; // 发布时间（时间戳）
      tns?: string[]; // 其他标题翻译
    }

    interface Artist {
      id: number; // 歌手 ID
      name: string; // 歌手名称
      tns: string[]; // 翻译或别名
      alias: string[]; // 别名
    }

    interface Album {
      id: number; // 专辑 ID
      name: string; // 专辑名称
      picUrl: string; // 专辑封面 URL
      tns: string[]; // 翻译或别名
      pic_str: string; // 封面图片字符串
      pic: number; // 封面图片 ID
    }

    interface Quality {
      br: number; // 比特率（单位：bps）
      fid: number; // 文件 ID
      size: number; // 文件大小（单位：字节）
      vd: number; // 音质评分（负值越小越差）
      sr: number; // 采样率（单位：Hz）
    }


    interface Result {
      code: number;
      songs: Song[];
    }


    const url = `${this.base_url}/playlist/track/all?id=${playlist_id}&limit=${limit}&offset=${offset}`;

    const response = await fetch(url);
    const data: Result = await response.json();
    const songs = data.songs;

    return PlaylistModel.build({
      platform: Platform.NET_EASE_CLOUD_MUSIC,
      platform_unique_id: playlist_id,
      title: '',
      description: '',
      created_at: new Date(),
      tracks: songs.map((song) => {
        return NetEaseCloudMusicTrackModel.build({
          platform: Platform.NET_EASE_CLOUD_MUSIC,
          platform_unique_id: song.id.toString(),
          title: song.name,
          artist: song.ar.map((artist) => artist.name).join('/'),
          album: song.al.name,
          duration: song.dt / 1000,
          cover_src: song.al.picUrl,
          created_at: new Date(),
          fee: song.fee,
        });
      }),
      creator: '',
      modified_at: new Date(),
      cover_src: '',
    });

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

