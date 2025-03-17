import axios from 'axios';
import { Lyric, LyricLine, TrackModel } from '@src/shared/types';
import { Platform } from '@main/enum/Platform';

export async function getLyrics(track_model: TrackModel): Promise<Lyric> {
  const track_identifier = track_model.getIdentifier();
  console.log('后台收到加载歌词请求:', track_identifier);
  const base_url = 'https://neteasecloudmusicapi-tinkeracs-projects.vercel.app/';

  if (!track_identifier.platform_unique_id) {
    throw new Error('无效的歌曲标识符: 缺少 platform_unique_id 字段');
  }

  switch (track_identifier.platform) {
    case Platform.NET_EASE_CLOUD_MUSIC: {
      // 直接调用网易云音乐官方API获取歌词
      const url = `${base_url}lyric?id=${track_identifier.platform_unique_id}`;
      const response = await axios.get(url, { timeout: 10000 }); // 设置 10 秒超时

      try {
        const data = await response.data;
        if (!data.lrc || typeof data.lrc.lyric !== 'string') {
          throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
        }
        console.log('获取歌词数据:', data);
        const rawLyric = data.lrc.lyric;
        const lines: LyricLine[] = [];
        // 正则表达式用于匹配歌词行：[mm:ss.mmm]后面的文本
        const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
        // 按换行符分割歌词文本
        const lyricLines = rawLyric.split('\n');

        for (const line of lyricLines) {
          if (line.trim() === '') continue; // 跳过空行
          const match = line.match(regex);
          if (match) {
            // 提取时间：分钟、秒钟和毫秒
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            // 计算总时间（单位：毫秒）
            const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
            const text = match[4].trim();
            lines.push({ time, text });
          }
        }
        console.log('解析歌词成功:', lines);
        return Promise.resolve({ lines });
      } catch (error) {
        console.error('解析歌词时出错:', error);
        throw error;
      }
    }
    default: {
      // 默认情况：通过 歌名-作者 搜索后再解析歌词
      const searchUrl = `${base_url}search?limit=5&keywords=${encodeURIComponent(
        track_model.title + ' ' + track_model.artist
      )}`;
      const response = await axios.get(searchUrl, { timeout: 10000 }); // 设置 10 秒超时

      // 检查搜索结果是否存在
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

      // 统一使用网易云音乐官方API获取歌词
      const lyricUrl = `${base_url}lyric?id=${id}`;
      const lyricResponse = await axios.get(lyricUrl, { timeout: 10000 });
      try {
        const data = await lyricResponse.data;
        if (!data.lrc || typeof data.lrc.lyric !== 'string') {
          throw new Error('无效的歌词数据: 缺少 lrc.lyric 字段');
        }
        console.log('通过搜索获取歌词数据:', data);
        const rawLyric = data.lrc.lyric;
        const lines: LyricLine[] = [];
        const regex = /^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)$/;
        const lyricLines = rawLyric.split('\n');
        for (const line of lyricLines) {
          if (line.trim() === '') continue;
          const match = line.match(regex);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            const time = minutes * 60 * 1000 + seconds * 1000 + milliseconds;
            const text = match[4].trim();
            lines.push({ time, text });
          }
        }
        console.log('解析歌词成功:', lines);
        return Promise.resolve({ lines });
      } catch (error) {
        console.error('解析歌词时出错:', error);
        throw error;
      }
    }
  }
}