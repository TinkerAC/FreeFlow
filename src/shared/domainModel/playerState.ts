import { QueueDump } from '@renderer/core/player/PlayQueue';

/**
 * PlayerState 类：表示播放器的当前状态
 */
export class PlayerState {
  queue: QueueDump;
  volume: number;
  playbackMode: 'loop' | 'shuffle' | 'repeat';
  audioSrc: string;
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;

  /**
   * 返回一个空的播放器状态
   */
  static empty(): PlayerState {
    return {
      queue: null,
      volume: 1,
      playbackMode: 'loop',
      audioSrc: '',
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
    };
  }
}