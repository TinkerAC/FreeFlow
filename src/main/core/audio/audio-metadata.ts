// audio-metadata.ts
import type { IAudioMetadata, ICommonTagsResult } from 'music-metadata';

/**
 * 音频格式/编解码层面信息
 */
export interface AudioFormatInfo {
  container: string;          // e.g. 'MPEG', 'WAVE/RIFF'
  codec: string;              // e.g. 'MP3', 'FLAC'
  bitrate?: number;           // 比特率 (bps)
  sampleRate?: number;        // 采样率 (Hz)
  numberOfChannels?: number;  // 声道数
  duration?: number;          // 音频时长 (秒)
}

/**
 * 标签信息（ID3 / Vorbis / APE …）
 * music-metadata 已经提供了良好的类型 ICommonTagsResult，
 * 这里简单 re-export，方便定制扩展。
 */
export type AudioTagInfo = ICommonTagsResult;

/**
 * readMeta 返回结构
 */
export interface AudioMetadata {
  format: AudioFormatInfo;
  tags: AudioTagInfo;
  /**
   * 原始完整元数据，如需进一步分析可直接使用。
   * 你可以在调用端选择保留或去除该字段。
   */
  raw: IAudioMetadata;
}