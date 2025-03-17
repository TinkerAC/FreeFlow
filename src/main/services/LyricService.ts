import axios from 'axios';
import { Lyric, LyricLine, TrackModel } from '@src/shared/types';
import { Platform } from '@main/enum/Platform';

/**
 * 将原始歌词字符串解析为[Lyric]对象
 * @param rawLyric 原始歌词字符串
 * @returns 解析后的Lyric对象
 */
function parseLyrics(rawLyric: string): Lyric {
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

/**
 * 根据传入 TrackModel 获取歌词数据
 * @param track_model 歌曲模型
 * @returns Promise<Lyric>
 *
 * 注意：本函数中不在内部捕获异常，而是将异常向上传递，
 * 使得调用者能够统一处理错误，避免局部捕获后再 throw 的冗余。
 */
export async function getLyrics(track_model: TrackModel): Promise<Lyric> {
  const track_identifier = track_model.getIdentifier();
  console.log('后台收到加载歌词请求:', track_identifier);
  const base_url = 'https://neteasecloudmusicapi-tinkeracs-projects.vercel.app/';

  if (!track_identifier.platform_unique_id) {
    throw new Error('无效的歌曲标识符: 缺少 platform_unique_id 字段');
  }

  // 对于网易云音乐平台直接调用官方 API 获取歌词
  if (track_identifier.platform === Platform.NET_EASE_CLOUD_MUSIC) {
    const url = `${base_url}lyric?id=${track_identifier.platform_unique_id}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;
    if (!data.lrc || typeof data.lrc.lyric !== 'string') {
      throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
    }
    console.log('获取歌词数据:', data);
    return parseLyrics(data.lrc.lyric);
  } else {
    // 默认情况下，通过歌名和歌手搜索后获取歌词
    const searchUrl = `${base_url}search?limit=5&keywords=${encodeURIComponent(
      track_model.title + ' ' + track_model.artist,
    )}`;
    const response = await axios.get(searchUrl, { timeout: 10000 });
    if (
      !response.data ||
      !response.data.result ||
      !response.data.result.songs ||
      response.data.result.songs.length === 0
    ) {
      throw new Error('未找到相关歌曲');
    }
    // 取搜索结果中第一首歌的 id
    const id = response.data.result.songs[0].id;
    console.log('搜索结果获取到歌曲id:', id);

    const lyricUrl = `${base_url}lyric?id=${id}`;
    const lyricResponse = await axios.get(lyricUrl, { timeout: 10000 });
    const data = lyricResponse.data;
    if (!data.lrc || typeof data.lrc.lyric !== 'string') {
      throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
    }
    console.log('通过搜索获取歌词数据:', data);
    return parseLyrics(data.lrc.lyric);
  }
}