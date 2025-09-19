import axios from 'axios';
import { injectable } from 'inversify';
import { Platform } from '@main/core/enum/Platform';
import { ContentProvider } from '../ContentProvider';
import {
  CheckMusicResponse,
  CloudSearchResponse,
  NetEaseCloudMusicTrackResponse,
  Result,
  Song,
} from '@main/contentProvider/NetEaseCloudMusic/NetEaseCloudMusicInterfaces';
import { NetEaseCloudMusicTrackModel, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';


/**
 * NetEaseCloudMusic 实现 ContentProvider 接口，
 * 重构后将原有的 cloudSearch 与 getNetEaseMusicLink 分别改名并合并到 searchTracks 与 getTrackLink 方法中，
 * 新类覆盖了原有逻辑。
 */
@injectable()
export default class NetEaseCloudMusic implements ContentProvider {
  public readonly platformName: Platform;
  public readonly serverNodes: string[];
  private readonly base_url: string;

  constructor() {
    this.serverNodes = ['http://47.97.185.179/neteasecloudmusicapi/', 'https://neteasecloudmusicapi-pi-flax.vercel.app/',
    ];
    this.base_url = this.serverNodes[0];
    this.platformName = Platform.NET_EASE_CLOUD_MUSIC;
  }


  /**
   * 根据关键词搜索网易云音乐免费歌曲，并返回统一的 TrackRecord 数组
   * （原 cloudSearch 方法逻辑重构而来，参数已内置默认值）
   * @param keyword 搜索关键词
   * @param filterPaid 是否过滤付费歌曲（默认值 true）
   */
  public async searchTrack(
    keyword: string,
    filterPaid: boolean = true,
  ): Promise<TrackEntity[]> {
    // 构造请求 URL
    const url = `${this.base_url}cloudsearch?keywords=${encodeURIComponent(
      keyword,
    )}&type=1&limit=10&offset=0`;

    // 发起请求
    const response = await axios.get<CloudSearchResponse>(url);
    const songs: Song[] = response.data.result.songs;

    // 根据 filterPaid 决定是否过滤付费歌曲
    const resultSongs = filterPaid
      ? songs.filter((song) => this.isFree(song))
      : songs;

    // 打印日志
    console.log(`
网易云音乐搜索结果:
  ${filterPaid ? '免费歌曲' : '所有歌曲'}: ${resultSongs.length} 首
${resultSongs
      .map((song) => `  - ${song.name} (fee: ${song.fee})`)
      .join('\n')}
  `);

    // 构造并返回 TrackRecord 列表
    return resultSongs.map((song) =>
      NetEaseCloudMusicTrackModel.build({
        platform: 'NetEaseCloudMusic',
        platform_unique_id: song.id.toString(),
        title: song.name,
        artist: song.ar.map((artist) => artist.name).join('/'),
        album: song.al.name,
        duration: song.dt / 1000,
        cover_src: song.al.picUrl,
        created_at: new Date(),
        fee: song.fee,
      }),
    );
  }

  /**
   * 根据网易云音乐的唯一标识（歌曲 ID）获取播放链接
   * （原 getNetEaseMusicLink 方法逻辑重构而来）
   * @param uniqueId 网易云音乐歌曲的唯一标识，即歌曲 ID
   */
  public async getTrackLink(uniqueId: string): Promise<string> {
    const url = `${this.base_url}song/url/v1?id=${uniqueId}&level=lossless&realIP=112.10.128.83`;
    const response = await axios.get(url);
    const data: NetEaseCloudMusicTrackResponse = response.data;

    console.log(`网易云音乐歌曲链接详情:`, data);
    const trackData = data.data[0];
    return trackData.url;
  }

  /**
   * 搜索歌单
   * @param keyword 搜索关键词
   * @param type 类型（默认值 1000）
   * @param limit 数量（默认值 10）
   * @param offset 偏移量（默认值 0）
   */
  public async cloudSearchPlaylist(keyword: string, type: number = 1000, limit: number = 10, offset: number = 0): Promise<PlaylistEntity[]> {
    const url = `${this.base_url}cloudsearch?keywords=${keyword}&type=${type}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(url);
    const data: CloudSearchResponse = response.data;
    const playlists = data.result.playlists;

    return playlists.map((playlist) => {
      return PlaylistEntity.build({
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
  }

  /**
   * 根据关键词搜索网易云音乐的歌曲和歌单
   * @param keyword
   * @param filterPaid
   */
  public async search(
    keyword: string,
    filterPaid: boolean = true,
  ): Promise<FusionSearchResult> {
    try {
      const tracks = this.searchTrack(keyword, filterPaid);
      const playlists = this.cloudSearchPlaylist(keyword);
      //用promise.all 并发执行
      const [trackResults, playlistResults] = await Promise.all([tracks, playlists]);
      return {
        track_result: trackResults,
        playlist_result: playlistResults,
      };
    } catch (error) {
      console.error('[NetEaseCloudMusic.search] failed:', error);
      return { track_result: [], playlist_result: [] };
    }


  }

  /**
   * 获取歌单信息,只包含基本信息,不包含歌曲列表
   * @param playlist_id
   */
  public async getFullPlaylist(playlist_id: string): Promise<PlaylistEntity> {
    const url = `${this.base_url}playlist/detail?id=${playlist_id}`;
    const response = await axios.get(url);
    const data = response.data;
    const playlist = data.playlist;
    console.log('获取到的歌单基本信息:', playlist);
    const trackEntities = await this.getPlaylistDetail(playlist_id);
    console.debug('获取到的歌曲列表:', trackEntities);
    return PlaylistEntity.build({
      platform: Platform.NET_EASE_CLOUD_MUSIC,
      platform_unique_id: playlist.id.toString(),
      title: playlist.name,
      description: playlist.description,
      created_at: new Date(playlist.createTime),
      tracks: trackEntities,
      creator: playlist.creator.nickname,
      modified_at: new Date(playlist.updateTime),
      cover_src: playlist.coverImgUrl,
    });
  }

  /**
   * 获取歌单中的所有歌曲
   * @param playlist_id 歌单 ID
   * @param limit 数量（默认值 1000）
   * @param offset 偏移量（默认值 0）
   */
  private async getPlaylistDetail(playlist_id: string, limit: number = 1000, offset: number = 0): Promise<TrackEntity[]> {
    const url = `${this.base_url}/playlist/track/all?id=${playlist_id}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(url);
    const data: Result = response.data;
    const songs = data.songs;

    return songs.map((song) => {
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
    });
  }

  /**
   * 判断歌曲是否可以免费播放
   * @param song 歌曲数据
   */
  isFree(song: any): boolean {
    // fee 为 0 或 8 时，表示歌曲可以免费播放
    return song.fee === 0 || song.fee === 8;
  }

  /**
   * 检查音乐可用性
   * @param id 歌曲 ID
   */
  private async checkAvailability(id: string): Promise<boolean> {
    const url = `${this.base_url}check/music?id=${id}`;
    const response = await axios.get(url);
    const data: CheckMusicResponse = response.data;

    return data.success;
  }


  /**
   * 将三种不同歌词解析为 Lyric 对象
   * @param payload 可能包含 origin / translation / pronunciation 三段歌词
   */
  private parseLyrics(payload: {
    origin?: string;
    translation?: string;
    pronunciation?: string;
  }): Lyric {
    /** 解析单段 LRC 字符串为已排序的 LyricLine[] */
    const parseLyricSegment = (raw?: string): LyricLine[] => {
      if (typeof raw !== 'string' || !raw.trim()) return [];

      const regex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?](.*)$/;
      const lines: LyricLine[] = [];

      for (const row of raw.split('\n')) {
        const trimmed = row.trim();
        if (!trimmed) continue;

        const match = trimmed.match(regex);
        if (!match) continue;              // 无效行直接忽略

        const [, mm, ss, ms = '0', textRaw] = match;
        const time =
          parseInt(mm, 10) * 60_000 +
          parseInt(ss, 10) * 1_000 +
          parseInt(ms.padEnd(3, '0'), 10);

        lines.push({ time, text: textRaw.trim() });
      }

      // 按时间升序；若存在同一时间戳的多行则合并文本
      return lines
        .sort((a, b) => a.time - b.time)
        .reduce<LyricLine[]>((acc, cur) => {
          const prev = acc.at(-1);
          if (prev && prev.time === cur.time) {
            prev.text += ` / ${cur.text}`;
          } else {
            acc.push(cur);
          }
          return acc;
        }, []);
    };

    return {
      originLines: parseLyricSegment(payload.origin),
      translationLines: parseLyricSegment(payload.translation),
      pronunciationLines: parseLyricSegment(payload.pronunciation),
    };
  }

  /**
   * 根据歌曲唯一 ID 获取并解析歌词
   * @param uniqueId 歌曲 ID
   * @throws 网络或数据格式错误
   */
  async getLyrics(uniqueId: string): Promise<Lyric> {
    const url = `${this.base_url}lyric?id=${uniqueId}`;

    // 1. 请求接口（10 s 超时）
    let response;
    try {
      response = await axios.get(url, { timeout: 10_000 });
    } catch (err) {
      throw new Error(`网络请求失败: ${(err as Error).message}`);
    }

    // 2. 校验必要字段
    const data = response?.data;
    if (!data?.lrc?.lyric) {
      throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
    }

    // 3. 解析三段歌词
    return this.parseLyrics({
      origin: data.lrc?.lyric,
      translation: data.tlyric?.lyric,
      pronunciation: data.romalrc?.lyric,
    });
  }


}
