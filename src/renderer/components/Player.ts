// file: src/player/Player.ts
import { PlayerState, TrackIdentifier, TrackModel } from '@src/shared/types';
import getAudioSrc from '@main/services/loadAudio';
import { Platform } from '@main/enum/Platform';

type PlaybackMode = 'loop' | 'repeat' | 'shuffle';

export default class Player {
  /* --------------------- 基础状态 --------------------- */
  public queue: TrackModel[] = [];
  public indexList: number[] = [];
  public currentIndex = 0;

  public playbackMode: PlaybackMode = 'loop';
  public audioSrc = '';

  public isPlaying = false;
  public isLoading = false;

  public volume = 0.5;
  public currentTime = 0;

  public currentTrackInfo: TrackModel = {
    id: -1,
    platform: Platform.HIFINI,
    platform_unique_id: '',
    title: '无播放曲',
    artist: '',
    album: '',
    duration: 0,
    cover_src: '',
    created_at: undefined,
    getIdentifier(): TrackIdentifier {
      throw new Error('Function not implemented.');
    },
  };

  public nextTracks: TrackModel[] = [];

  public audio: HTMLAudioElement;
  public onStateChange: ((state: PlayerState) => void) | null = null;

  /* --------------------- 进度同步定时器 --------------------- */
  private progressTimer: number | null = null;

  /**
   * 开启 0.5 s 进度同步
   */
  private startProgressTimer() {
    if (this.progressTimer !== null) return; // 已经在跑
    this.progressTimer = window.setInterval(() => this.updateCurrentTime(), 500);
  }

  /**
   * 停止进度同步
   */
  private stopProgressTimer() {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  /**
   * 把 audio.currentTime → Player.currentTime，并通知外部
   */
  private updateCurrentTime = () => {
    this.currentTime = this.audio.currentTime;
    this.notifyStateChange();
  };

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
    this.audio.volume = this.volume;
  }

  /* --------------------- 事件监听封装 --------------------- */


  // 监听音频加载完成事件
  private onAudioCanPlay = () => {
    this.setCurrentTime(0);
    this.currentTrackInfo.duration = this.audio.duration;
    this.setupEndedListener();
    this.play();
  };

  private setupEndedListener() {
    this.audio.removeEventListener('ended', this.onAudioEnded);
    this.audio.addEventListener('ended', this.onAudioEnded, { once: true });
  }

  private onAudioEnded = () => {
    this.stopProgressTimer();
    if (this.playbackMode === 'repeat') {
      this.setCurrentTime(0);
      this.play();
    } else {
      this.playNext().then((r) => console.log('播放完毕, 尝试下一首', r));
    }
  };

  /* --------------------- 公共控制接口 --------------------- */
  private notifyStateChange() {
    this.onStateChange?.(this.dumpPlayerState());
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.startProgressTimer();

    this.audio
      .play()
      .catch((e) => {
        console.error('播放失败:', e);
        this.isPlaying = false;
        this.stopProgressTimer();
      })
      .finally(() => this.notifyStateChange());
  }

  public pause() {
    try {
      this.audio.pause();
    } catch (e) {
      console.error('暂停失败:', e);
    } finally {
      this.isPlaying = false;
      this.stopProgressTimer();
      this.notifyStateChange();
    }
  }

  public togglePlayPause() {
    this.isPlaying ? this.pause() : this.play();
  }

  /* --------------------- 计算索引 --------------------- */
  private getNextIndex(step = 1) {
    return this.indexList.length
      ? (this.currentIndex + step) % this.indexList.length
      : 0;
  }

  private getPrevIndex(step = 1) {
    return this.indexList.length
      ? (this.currentIndex - step + this.indexList.length) % this.indexList.length
      : 0;
  }

  /* --------------------- 核心切歌逻辑 --------------------- */
  public async playNext() {
    this.pause();
    if (!this.indexList.length) return;

    this.isLoading = true;
    this.notifyStateChange();

    let attempts = 0;
    const max = this.indexList.length;

    while (attempts < max) {
      const nextIdx = this.getNextIndex(attempts + 1);
      const trackIdx = this.indexList[nextIdx];
      const track = this.queue[trackIdx];

      try {
        const src = await getAudioSrc(track);

        /* --- 成功获取音源 --- */
        this.currentIndex = nextIdx;
        this.currentTrackInfo = track;
        this.audioSrc = src;
        this.isLoading = false;

        this.audio.src = src;
        this.audio.load();

        this.audio.addEventListener(
          'canplaythrough',
          () => {
            this.onAudioCanPlay();
          },
          { once: true },
        );

        this.updateNextTracks();
        this.notifyStateChange();
        return;
      } catch {
        attempts++;
      }
    }

    console.warn('所有曲目均无法播放');
    this.isLoading = false;
    this.notifyStateChange();
  }

  public async playPrevious() {
    this.pause();
    if (!this.indexList.length) return;

    this.isLoading = true;
    this.notifyStateChange();

    let attempts = 0;
    const max = this.indexList.length;

    while (attempts < max) {
      const prevIdx = this.getPrevIndex(attempts + 1);
      const trackIdx = this.indexList[prevIdx];
      const track = this.queue[trackIdx];

      try {
        const src = await getAudioSrc(track);

        /* --- 成功获取音源 --- */
        this.currentIndex = prevIdx;
        this.currentTrackInfo = track;
        this.audioSrc = src;
        this.isLoading = false;
        this.audio.src = src;
        this.audio.load();
        this.audio.addEventListener(
          'canplaythrough',
          () => {
            this.onAudioCanPlay();
          },
          { once: true },
        );

        this.updateNextTracks();
        this.notifyStateChange();
        return;
      } catch {
        attempts++;
      }
    }

    console.warn('所有曲目均无法播放');
    this.isLoading = false;
    this.notifyStateChange();
  }

  /* --------------------- 其它辅助功能 --------------------- */
  public setCurrentTime(time: number) {
    this.audio.currentTime = time;
    this.currentTime = time;
    this.notifyStateChange();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.audio.volume = this.volume;
    this.notifyStateChange();
  }

  public changeVolume(delta: number) {
    this.setVolume(this.volume + delta);
  }


  public addTrackToNext(track: TrackModel) {
    const exists = this.queue.findIndex(
      (t) => t.platform === track.platform && t.platform_unique_id === track.platform_unique_id,
    );

    if (exists !== -1) {
      const pos = this.indexList.indexOf(exists);
      if (pos !== -1) this.indexList.splice(pos, 1);
      this.indexList.splice(this.currentIndex + 1, 0, exists);
    } else {
      this.queue.push(track);
      this.indexList.splice(this.currentIndex + 1, 0, this.queue.length - 1);
    }

    this.updateNextTracks();
    this.notifyStateChange();
  }


  public addTrackToNextAndPlay(track: TrackModel) {
    this.addTrackToNext(track);
    this.playNext();
  }

  public async replacePlayQueue(tracks: TrackModel[], mode?: PlaybackMode) {
    this.pause();
    this.playbackMode = mode ?? this.playbackMode;

    switch (this.playbackMode) {
      case 'loop':
        this.indexList = tracks.map((_, i) => i);
        break;
      case 'shuffle':
        this.indexList = tracks.map((_, i) => i).sort(() => Math.random() - 0.5);
        break;
      case 'repeat':
        this.indexList = [0];
        break;
    }

    this.queue = [...tracks];
    this.currentIndex = 0;
    this.isLoading = true;
    this.notifyStateChange();

    const first = this.queue[this.indexList[0]];

    try {
      const src = await getAudioSrc(first);
      this.audioSrc = src;
      this.currentTrackInfo = first;
      this.isLoading = false;

      this.audio.src = src;
      this.audio.load();

      this.audio.addEventListener(
        'canplaythrough',
        () => {
          this.onAudioCanPlay();
        },
        { once: true },
      );

      this.updateNextTracks();
      this.notifyStateChange();
    } catch {
      console.warn('首曲获取失败，尝试下一首');
      await this.playNext();
    }
  }

  public cyclePlaybackMode() {
    const modes: PlaybackMode[] = ['loop', 'repeat', 'shuffle'];
    this.playbackMode = modes[(modes.indexOf(this.playbackMode) + 1) % modes.length];
    this.rebuildIndexList();
    this.notifyStateChange();
  }

  private updateNextTracks() {
    this.nextTracks = this.indexList.slice(this.currentIndex + 1).map((i) => this.queue[i]);
  }

  private rebuildIndexList() {
    const cur = this.indexList[this.currentIndex];
    switch (this.playbackMode) {
      case 'loop':
        this.indexList = this.queue.map((_, i) => i);
        break;
      case 'shuffle':
        this.indexList = this.queue.map((_, i) => i).sort(() => Math.random() - 0.5);
        break;
      case 'repeat':
        this.indexList = [cur];
        break;
    }
    this.currentIndex = this.indexList.indexOf(cur);
    this.updateNextTracks();
  }

  public dumpPlayerState(): PlayerState {
    return {
      queue: [...this.queue],
      indexList: [...this.indexList],
      currentIndex: this.currentIndex,
      playbackMode: this.playbackMode,
      audioSrc: this.audioSrc,
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.audio.currentTime,
      currentTrackInfo: this.currentTrackInfo,
      nextTracks: [...this.nextTracks],
      volume: this.audio.volume,
    };
  }

  public clearQueue() {
    this.pause();
    this.stopProgressTimer();

    this.queue = [];
    this.indexList = [];
    this.currentIndex = 0;
    this.audioSrc = '';
    this.currentTrackInfo = null;
    this.nextTracks = [];
    this.setCurrentTime(0);

    this.audio.src = '';
    this.notifyStateChange();
  }
}
