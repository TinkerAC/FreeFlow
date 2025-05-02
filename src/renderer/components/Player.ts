// file: src/player/Player.ts
import { PlayerState, TrackModel } from '@src/shared/types';
import getAudioSrc from '@main/services/loadAudio';
import { PlayQueue } from '@renderer/core/PlayQueue';

type PlaybackMode = 'loop' | 'repeat' | 'shuffle';

export default class Player {
  /* --------------------- 基础状态 --------------------- */
  public playQueue: PlayQueue = new PlayQueue();

  public playbackMode: PlaybackMode = 'loop';

  public isPlaying: boolean = false;
  public isLoading: boolean = false;

  public volume: number = 0.5;
  public currentTime: number = 0;


  public audio: HTMLAudioElement;
  public onStateChange: ((state: PlayerState) => void) | null = null;

  /* --------------------- 进度同步定时器 --------------------- */
  private progressTimer: number | null = null;

  constructor(audio: HTMLAudioElement) {
    this.audio = audio;
    this.audio.volume = this.volume;
  }

  public async loadFromDump(dump: PlayerState) {
    this.playQueue.loadFromDump(dump.queue);
    this.isPlaying = false;
    this.isLoading = false;
    this.volume = dump.volume;
    this.playbackMode = dump.playbackMode;

    //如果之前有播放中的音乐,要尝试加载
    const currentTrack: TrackModel | null = this.playQueue.currentTrack;
    if (currentTrack) {
      console.info('存在播放中音乐，尝试重新加载');
      // 1. 先把音源给 audio 元素并 load
      this.audio.src = await getAudioSrc(currentTrack);
      this.audio.load();

      // 2. metadata 加载完就可以安全设置 currentTime
      this.audio.addEventListener(
        'loadedmetadata',
        () => {
          // 恢复进度
          console.log(`dump 进度:${dump.currentTime},实际最大进度:${this.audio.duration}`);
          this.audio.currentTime = dump.currentTime;
          console.info('进度已恢复到', dump.currentTime, '秒');
          this.currentTime = dump.currentTime;
          this.notifyStateChange();
        },
        { once: true },
      );

    }
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

  /* --------------------- 核心切歌逻辑 --------------------- */
  public async playNext() {
    this.pause();
    if (this.playQueue.isEmpty) {
      return;
    }
    this.isLoading = true;
    this.notifyStateChange();

    const track = this.playQueue.getNextTrack();
    console.debug('从 队列中获取的下一首歌的 信息 :  track:', track);

    const src = await getAudioSrc(track);

    /* --- 成功获取音源 --- */
    this.playQueue.moveNext();

    this.loadAudio(src);
    this.audio.addEventListener(
      'canplay',
      () => {
        this.onAudioCanPlay();
      },
      { once: true },
    );
    this.notifyStateChange();
    this.isLoading = false;
    this.notifyStateChange();
  }

  /* --------------------- 事件监听封装 --------------------- */

  public async playPrevious() {
    this.pause();
    if (this.playQueue.isEmpty) return;
    this.isLoading = true;
    this.notifyStateChange();
    const track = this.playQueue.getPrevTrack();
    const src = await getAudioSrc(track);

    /* --- 成功获取音源 --- */

    this.playQueue.movePrev();

    this.loadAudio(src);
    this.audio.addEventListener(
      'canplay',
      () => {
        this.onAudioCanPlay();
      },
      { once: true },
    );

    // this.updateNextTracks();
    this.notifyStateChange();


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
    this.playQueue._addTrackToNextInQueue(track, this.playbackMode);
    this.notifyStateChange();
  }

  public addTrackToNextAndPlay(track: TrackModel) {
    this.addTrackToNext(track);
    this.playNext().then();
  }

  public async replacePlayQueue(tracks: TrackModel[], mode?: PlaybackMode) {

    this.pause();
    this.playbackMode = mode ?? this.playbackMode;

    this.playQueue.replaceQueueLibraryAndIndexList(tracks, this.playbackMode);

    this.isLoading = true;
    this.notifyStateChange();

    const first: TrackModel = this.playQueue.getHeadTrack();

    try {
      const src = await getAudioSrc(first);
      this.isLoading = false;
      this.audio.src = src;
      this.audio.load();
      this.audio.addEventListener(
        'canplay',
        () => {
          this.onAudioCanPlay();
        },
        { once: true },
      );

      this.notifyStateChange();
    } catch {
      console.warn('首曲获取失败，尝试下一首');
      await this.playNext();
    }
  }

  public cyclePlaybackMode() {
    const modes: PlaybackMode[] = ['loop', 'repeat', 'shuffle'];
    const nextMode =
      modes[(modes.indexOf(this.playbackMode) + 1) % modes.length];

    this.setPlayBackMode(nextMode);
  }

  public setPlayBackMode(mode: PlaybackMode) {
    this.playbackMode = mode;
    this.playQueue.rebuildIndexList(mode);
    this.notifyStateChange();
  }

  public dumpPlayerState(): PlayerState {
    return {
      queue: this.playQueue.dump(),
      playbackMode: this.playbackMode,
      audioSrc: '',
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.audio.currentTime,
      volume: this.audio.volume,
    };
  }

  public clearQueue() {
    this.pause();
    this.stopProgressTimer();
    this.playQueue.clear();
    this.setCurrentTime(0);
    this.audio.src = '';
    this.notifyStateChange();
  }

  /**
   * 开启 0.5 s 进度同步
   */
  private startProgressTimer() {
    if (this.progressTimer !== null) return; // 已经在跑
    this.progressTimer = window.setInterval(() => this.updateCurrentTime(), 500);
  }

  private loadAudio(audioSrc: string) {
    this.isLoading = true;
    this.notifyStateChange();
    this.audio.src = audioSrc;
    this.audio.load();

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

  // 监听音频加载完成事件
  private onAudioCanPlay = () => {
    this.setCurrentTime(0);
    this.playQueue.currentTrack.duration = this.audio.duration;
    this.setupEndedListener();
    this.play();
  };

  private setupEndedListener() {
    this.audio.removeEventListener('ended', this.onAudioEnded);
    this.audio.addEventListener('ended', this.onAudioEnded, { once: true });
  }

  private onAudioEnded = () => {
    this.stopProgressTimer();
    this.playNext().then((r) => console.log('播放完毕, 尝试下一首', r));
  };

  /* --------------------- 公共控制接口 --------------------- */
  private notifyStateChange() {
    this.onStateChange?.(this.dumpPlayerState());
  }


}
