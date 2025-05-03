import axios from 'axios';
import { injectable } from 'inversify';
import { Platform } from '@main/enum/Platform';
import { ContentProvider } from '../ContentProvider';
import {
  CheckMusicResponse,
  CloudSearchResponse,
  NetEaseCloudMusicTrackResponse,
  Result,
  Song,
} from '@main/contentProvider/NetEaseCloudMusic/Interfaces';
import { NetEaseCloudMusicTrackModel, TrackModel } from '@src/shared/domainModel/TrackModel';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { PlaylistModel } from '@src/shared/domainModel/playlistModel';


/**
 * NetEaseCloudMusic 实现 ContentProvider 接口，
 * 重构后将原有的 cloudSearch 与 getNetEaseMusicLink 分别改名并合并到 searchTracks 与 getTrackLink 方法中，
 * 新类覆盖了原有逻辑。
 */
@injectable()
export default class NetEaseCloudMusic implements ContentProvider {
  public readonly platformName: string;
  public readonly serverNodes: string[];
  private readonly base_url: string;

  constructor() {
    this.serverNodes = ['http://47.97.185.179/neteasecloudmusicapi/', 'https://neteasecloudmusicapi-pi-flax.vercel.app/',
    ];
    this.base_url = this.serverNodes[0];
    this.platformName = 'NetEaseCloudMusic';
  }


  /**
   * 根据关键词搜索网易云音乐免费歌曲，并返回统一的 TrackModel 数组
   * （原 cloudSearch 方法逻辑重构而来，参数已内置默认值）
   * @param keyword 搜索关键词
   * @param filterPaid 是否过滤付费歌曲（默认值 true）
   */
  public async searchTracks(
    keyword: string,
    filterPaid: boolean = true,
  ): Promise<TrackModel[]> {
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

    // 构造并返回 TrackModel 列表
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
  public async cloudSearchPlaylist(keyword: string, type: number = 1000, limit: number = 10, offset: number = 0): Promise<PlaylistModel[]> {
    const url = `${this.base_url}cloudsearch?keywords=${keyword}&type=${type}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(url);
    const data: CloudSearchResponse = response.data;
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
  }

  /**
   * 获取歌单详情
   * @param playlist_id 歌单 ID
   * @param limit 数量（默认值 1000）
   * @param offset 偏移量（默认值 0）
   */
  public async getPlaylistDetail(playlist_id: string, limit: number = 1000, offset: number = 0): Promise<PlaylistModel> {
    const url = `${this.base_url}/playlist/track/all?id=${playlist_id}&limit=${limit}&offset=${offset}`;
    const response = await axios.get(url);
    const data: Result = response.data;
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

  /**
   * 判断歌曲是否可以免费播放
   * @param song 歌曲数据
   */
  isFree(song: any): boolean {
    // fee 为 0 或 8 时，表示歌曲可以免费播放
    return song.fee === 0 || song.fee === 8;
  }

  async getLyrics(uniqueId: string): Promise<Lyric | void> {
    const url = `${this.base_url}lyric?id=${uniqueId}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    if (!data.lrc || typeof data.lrc.lyric !== 'string') {
      throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
    }
    console.log('获取歌词数据:', data);
    return this.parseLyrics(data.lrc.lyric);
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
   * 将原始歌词字符串解析为[Lyric]对象
   * @param rawLyric 原始歌词字符串
   * @returns 解析后的Lyric对象
   */
  private parseLyrics(rawLyric: string): Lyric {
    const lines: LyricLine[] = [];
    // 匹配形如 [mm:ss.mmm] 的时间标签和后面的文本
    const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})](.*)$/;
    for (const line of rawLyric.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(regex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = parseInt(match[3], 10);
        // 计算总时间（单位：毫秒）
        const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
        const text = match[4].trim();
        lines.push({ time, text });
      }
    }
    return { lines };
  }

}