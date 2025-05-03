/**
 * LyricLine 接口：表示歌词中的一行，包含时间（毫秒）和文本
 */
export interface LyricLine {
  time: number;
  text: string;
}

/**
 * Lyric 接口：表示完整歌词，包含多行歌词
 */
export interface Lyric {
  lines: LyricLine[];
}