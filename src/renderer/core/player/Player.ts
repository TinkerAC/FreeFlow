// file: src/player/Player.ts
import getAudioSrc from '@main/services/loadAudio';
import { PlayQueue } from '@renderer/core/player/PlayQueue';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlayerState } from '@src/shared/domainModel/playerState';

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

  /**
   * 从 dump 状态恢复播放器
   */
  public async loadFromDump(dump: PlayerState) {
    // 恢复队列和基础属性
    this.playQueue.loadFromDump(dump.queue);
    this.volume = dump.volume;
    this.audio.volume = this.volume;
    this.playbackMode = dump.playbackMode;
    this.currentTime = dump.currentTime;
    // 默认先暂停和加载中
    this.isPlaying = false;
    this.isLoading = true;
    this.notifyStateChange();

    const currentTrack = this.playQueue.currentTrack;
    if (currentTrack) {
      console.info('存在播放中音乐，尝试重新加载');
      // 设置音源并加载
      this.audio.src = await getAudioSrc(currentTrack);
      this.audio.load();

      // 元数据加载完成后恢复状态
      this.audio.addEventListener(
        'loadedmetadata',
        () => {
          console.log(
            `dump 进度:${dump.currentTime},实际最大进度:${this.audio.duration}`,
          );
          // 恢复进度
          this.audio.currentTime = dump.currentTime;
          this.currentTime = dump.currentTime;
          // 同步队列中 track 的时长
          if (this.playQueue.currentTrack) {
            this.playQueue.currentTrack.duration = this.audio.duration;
          }
          // 绑定结束事件
          this.setupEndedListener();


          this.isLoading = false;
          this.notifyStateChange();


        },
        { once: true },
      );
    } else {
      // 没有曲目，结束加载
      this.isLoading = false;
      this.notifyStateChange();
    }
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.isLoading = false;
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

  public async playNext() {
    this.pause();
    if (this.playQueue.isEmpty) return;
    this.isLoading = true;
    this.notifyStateChange();

    const track = this.playQueue.getNextTrack();
    console.debug('从 队列中获取的下一首歌的 信息 :  track:', track);
    const src = await getAudioSrc(track);

    this.playQueue.moveNext();
    this.loadAudio(src);
    this.audio.addEventListener(
      'canplay',
      () => this.onAudioCanPlay(),
      { once: true },
    );
    this.notifyStateChange();
    this.isLoading = false;
    this.notifyStateChange();
  }

  public async playPrevious() {
    this.pause();
    if (this.playQueue.isEmpty) return;
    this.isLoading = true;
    this.notifyStateChange();
    const track = this.playQueue.getPrevTrack();
    const src = await getAudioSrc(track);

    this.playQueue.movePrev();
    this.loadAudio(src);
    this.audio.addEventListener(
      'canplay',
      () => this.onAudioCanPlay(),
      { once: true },
    );
    this.notifyStateChange();
    this.isLoading = false;
    this.notifyStateChange();
  }

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

  public addTrackToNext(track: TrackEntity) {
    this.playQueue._addTrackToNextInQueue(track, this.playbackMode);
    this.notifyStateChange();
  }

  public addTrackToNextAndPlay(track: TrackEntity) {
    this.addTrackToNext(track);
    this.playNext().then();
  }

  public async replacePlayQueue(tracks: TrackEntity[], mode?: PlaybackMode) {
    this.pause();
    this.playbackMode = mode ?? this.playbackMode;
    this.playQueue.replaceQueueLibraryAndIndexList(
      tracks,
      this.playbackMode,
    );
    this.isLoading = true;
    this.notifyStateChange();

    const first: TrackEntity = this.playQueue.getHeadTrack();
    try {
      const src = await getAudioSrc(first);
      this.isLoading = false;
      this.audio.src = src;
      this.audio.load();
      this.audio.addEventListener(
        'canplay',
        () => this.onAudioCanPlay(),
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

  private startProgressTimer() {
    if (this.progressTimer !== null) return;
    this.progressTimer = window.setInterval(
      () => this.updateCurrentTime(),
      500,
    );
  }

  private loadAudio(audioSrc: string) {
    this.isLoading = true;
    this.notifyStateChange();
    this.audio.src = audioSrc;
    this.audio.load();
  }

  private stopProgressTimer() {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private updateCurrentTime = () => {
    this.currentTime = this.audio.currentTime;
    this.notifyStateChange();
  };

  private onAudioCanPlay = () => {
    this.setCurrentTime(0);
    if (this.playQueue.currentTrack) {
      this.playQueue.currentTrack.duration = this.audio.duration;
    }
    this.setupEndedListener();
    this.play();
  };

  private setupEndedListener() {
    this.audio.removeEventListener('ended', this.onAudioEnded);
    this.audio.addEventListener('ended', this.onAudioEnded, { once: true });
  }

  private onAudioEnded = () => {
    this.stopProgressTimer();
    this.playNext().then((r) =>
      console.log('播放完毕, 尝试下一首', r),
    );
  };

  private notifyStateChange() {
    this.onStateChange?.(this.dumpPlayerState());
  }
}
