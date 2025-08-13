// file: src/player/PlayerController.ts
import getAudioSrc from '@main/services/loadAudio';
import { PlayQueue } from '@renderer/core/controller/PlayQueue';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { PlaybackMode } from '@renderer/core/enum/PlaybackMode';
import { AbstractController } from '@renderer/core/controller/AbstractController';
import { libraryContext } from '@renderer/core/electronContextApi';

/**
 * PlayerController 负责管理音频播放逻辑与状态。
 * 继承自 AbstractController<[PlayerState]>，
 * 通过发布/订阅机制向外部推送 PlayerState 状态变化。
 */
export default class PlayerController extends AbstractController<[PlayerState]> {
  /* --------------------- 基础状态 --------------------- */
  public playQueue: PlayQueue = new PlayQueue();
  public playbackMode: PlaybackMode = PlaybackMode.LOOP;
  public isPlaying: boolean = false;
  public isLoading: boolean = false;
  public volume: number = 0.5;
  public currentTime: number = 0;

  public audio: HTMLAudioElement;

  /* --------------------- 进度同步定时器 --------------------- */
  private progressTimer: number | null = null;

  /* --------------------- 加载意图控制 --------------------- */
  private currentLoadIntentId: symbol | null = null;
  private intendedAudioSrc: string | null = null; // 当前期望播放的音频源

  constructor(audio: HTMLAudioElement) {
    super(); // 初始化 AbstractController
    this.audio = audio;
    this.audio.volume = this.volume;
    this.initMediaSession();
  }

  /**
   * 返回当前应推送给订阅者的状态元组。
   */
  protected getCurrentStateForSubscriber(): [PlayerState] {
    return [this.dumpPlayerState()];
  }

  /**
   * 内部状态变动后调用，触发订阅者回调。
   */
  private notifyStateChange() {
    this.notify(); // 使用 AbstractController 提供的通知功能
  }

  /* ------------------------------------------------------------------ */
  /*                      以下为原本 PlayerController 逻辑               */

  /* ------------------------------------------------------------------ */

  /**
   * 核心私有方法：加载并准备音轨进行播放或恢复。
   * @param track 要加载的音轨，如果为 null，则清理播放器状态。
   * @param isDumpLoad 是否为从 dump 状态恢复的加载。
   * @param dumpTime 如果是 dump 加载，指定的恢复时间。
   */
  private async _loadAndPrepareTrack(
    track: TrackEntity | null,
    isDumpLoad: boolean = false,
    dumpTime: number = 0,
  ): Promise<void> {
    if (!track) {
      this.clearAudioState();
      return;
    }

    const localLoadIntentId = Symbol('loadIntent');
    this.currentLoadIntentId = localLoadIntentId;
    this.isLoading = true;
    this.notifyStateChange();

    try {
      const src: string = await getAudioSrc(track);

      // 检查加载意图是否已改变
      if (this.currentLoadIntentId !== localLoadIntentId) {
        console.warn(`Player._loadAndPrepareTrack: 音轨 "${track.title}" 的加载意图已改变，放弃本次加载。`);
        return;
      }

      this.intendedAudioSrc = src;

      // 移除旧监听器
      this.audio.removeEventListener('loadedmetadata', this._dynamicLoadedMetadataHandler);
      this.audio.removeEventListener('canplay', this._dynamicCanplayHandler);

      this.audio.src = src;
      this.audio.load();

      const eventToListen = isDumpLoad ? 'loadedmetadata' : 'canplay';

      const handler = isDumpLoad
        ? () => this._onAudioPreparedForDumpLoad(localLoadIntentId, dumpTime, track, src)
        : () => this._onAudioPreparedForPlay(localLoadIntentId, track, src);

      if (isDumpLoad) {
        this._dynamicLoadedMetadataHandler = handler;
      } else {
        this._dynamicCanplayHandler = handler;
      }

      this.audio.addEventListener(eventToListen, handler, { once: true });
    } catch (error) {
      console.error(`Player._loadAndPrepareTrack: 获取音轨 "${track.title}" 的 SRC 失败:`, error);
      if (this.currentLoadIntentId === localLoadIntentId) {
        this.isLoading = false;
        this.intendedAudioSrc = null;
        this.notifyStateChange();
      }
    }
  }

  // 用于存储动态创建的事件处理器
  private _dynamicCanplayHandler: (() => void) | null = null;
  private _dynamicLoadedMetadataHandler: (() => void) | null = null;

  /**
   * canplay 事件处理。
   */
  private _onAudioPreparedForPlay = (expectedLoadIntentId: symbol, track: TrackEntity, expectedSrc: string): void => {
    if (this.currentLoadIntentId !== expectedLoadIntentId || this.audio.src !== expectedSrc) {
      console.warn(`Player._onAudioPreparedForPlay: 音轨 "${track.title}" 的事件已过时或意图改变。`);
      return;
    }

    this.updateMediaSessionForTrack(track);
    this.setCurrentTime(0);

    if (this.playQueue.currentTrack && this.playQueue.currentTrack.id === track.id) {
      this.playQueue.currentTrack.duration = this.audio.duration || 0;
    }

    this.setupEndedListener();
    this.play();
  };

  /**
   * loadedmetadata 事件处理（dump 恢复）。
   */
  private _onAudioPreparedForDumpLoad = (expectedLoadIntentId: symbol, dumpTime: number, track: TrackEntity, expectedSrc: string): void => {
    if (this.currentLoadIntentId !== expectedLoadIntentId || this.audio.src !== expectedSrc) {
      console.warn(`Player._onAudioPreparedForDumpLoad: 音轨 "${track.title}" 的事件已过时或意图改变。`);
      return;
    }

    console.log(`Player (Dump Load): 正在为 "${track.title}" 恢复播放进度 ${dumpTime} / ${this.audio.duration}`);
    const newTime = Math.min(dumpTime, this.audio.duration || dumpTime);
    this.audio.currentTime = newTime;
    this.currentTime = newTime;

    if (this.playQueue.currentTrack && this.playQueue.currentTrack.id === track.id) {
      this.playQueue.currentTrack.duration = this.audio.duration || 0;
    }

    this.setupEndedListener();
    this.updateMediaSessionForTrack(track);

    this.isLoading = false;
    this.notifyStateChange();
  };

  /* --------------------- 公开方法：播放器控制 --------------------- */

  public async loadFromDump(dump: PlayerState) {
    this.currentLoadIntentId = null;
    if (this.isPlaying || this.isLoading) {
      this.pause();
    }
    this.audio.src = '';
    this.intendedAudioSrc = null;

    this.playQueue.loadFromDump(dump.queue);
    this.volume = dump.volume;
    this.audio.volume = this.volume;
    this.playbackMode = dump.playbackMode;

    this.isPlaying = false;
    this.isLoading = false;
    this.notifyStateChange();

    const trackToRestore = this.playQueue.currentTrack;
    if (trackToRestore) {
      console.info(`Player: 正在从 dump 状态恢复音轨 "${trackToRestore.title}"`);
      await this._loadAndPrepareTrack(trackToRestore, true, dump.currentTime);

      if (dump.isPlaying && !this.isLoading) {
        this.play();
      } else if (dump.isPlaying && this.isLoading) {
        console.warn('PlayerController: Dump 状态要求播放，但音轨仍在加载或准备失败。');
      }
    } else {
      this.clearAudioState();
    }
  }

  public play() {
    if (this.isPlaying) return;
    if (!this.audio.src || !this.intendedAudioSrc) {
      console.warn('PlayerController.play: 没有有效的音频源或加载意图。');
      return;
    }

    if (this.audio.src !== this.intendedAudioSrc) {
      console.warn(`Player.play: audio.src ("${this.audio.src}") 与 intendedAudioSrc ("${this.intendedAudioSrc}") 不符。`);
      this.isLoading = false;
      this.notifyStateChange();
      return;
    }

    this.isPlaying = true;
    this.isLoading = false;
    this.startProgressTimer();

    this.audio.play()
      .then(() => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
        this.notifyStateChange();
      })
      .catch((e) => {
        console.error('PlayerController.play: 播放失败:', e);
        this.isPlaying = false;
        this.stopProgressTimer();
        this.notifyStateChange();
      });
  }

  public pause() {
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.stopProgressTimer();

    try {
      if (!this.audio.paused) {
        this.audio.pause();
      }
    } catch (e) {
      console.error('PlayerController.pause: 暂停失败:', e);
    } finally {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      if (wasPlaying) {
        this.notifyStateChange();
      }
    }
  }

  public togglePlayPause() {
    this.isPlaying ? this.pause() : this.play();
  }

  public async playNext() {
    this.pause();
    const nextTrackInfo = this.playQueue.getNextTrack();
    if (!nextTrackInfo) {
      this.clearAudioState();
      return;
    }
    this.playQueue.moveNext();
    this.updateMediaSessionForTrack(this.playQueue.currentTrack);
    await this._loadAndPrepareTrack(this.playQueue.currentTrack);
  }

  public async playPrevious(): Promise<void> {
    this.pause();
    const prevTrackInfo = this.playQueue.getPrevTrack();
    if (!prevTrackInfo) {
      this.clearAudioState();
      return;
    }
    this.playQueue.movePrev();
    this.updateMediaSessionForTrack(this.playQueue.currentTrack);
    await this._loadAndPrepareTrack(this.playQueue.currentTrack);
  }

  public setCurrentTime(time: number) {
    if (isNaN(time)) {
      console.warn('PlayerController.setCurrentTime: 尝试设置无效的时间 (NaN)。');
      return;
    }
    const MUTE_ERROR_THRESHOLD = 0.1;
    if (this.audio.readyState > 0 && Math.abs(this.audio.currentTime - time) > MUTE_ERROR_THRESHOLD) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || time));
    } else if (this.audio.readyState === 0) {
      console.warn('PlayerController.setCurrentTime: 音频尚未准备好，currentTime 设置可能不准确。');
    }
    this.currentTime = this.audio.currentTime;
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
    this.currentLoadIntentId = null;

    this.playbackMode = mode ?? this.playbackMode;
    this.playQueue.replaceQueueLibraryAndIndexList(tracks, this.playbackMode);

    const firstTrackToPlay = this.playQueue.currentTrack;
    if (firstTrackToPlay) {
      this.updateMediaSessionForTrack(firstTrackToPlay);
      await this._loadAndPrepareTrack(firstTrackToPlay);
    } else {
      this.clearAudioState();
    }
  }

  public cyclePlaybackMode() {
    const modes: PlaybackMode[] = [PlaybackMode.LOOP, PlaybackMode.REPEAT, PlaybackMode.SHUFFLE];
    const currentIndex = modes.indexOf(this.playbackMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    this.setPlayBackMode(nextMode);
  }

  public setPlayBackMode(mode: PlaybackMode) {
    if (this.playbackMode === mode) return;
    this.playbackMode = mode;
    const oldCurrentTrackId = this.playQueue.currentTrack?.id;
    this.playQueue.rebuildIndexList(mode);
    const newCurrentTrack = this.playQueue.currentTrack;
    this.notifyStateChange();

    if (newCurrentTrack && newCurrentTrack.id !== oldCurrentTrackId) {
      this.updateMediaSessionForTrack(newCurrentTrack);
    } else if (!newCurrentTrack && oldCurrentTrackId) {
      this.clearAudioState();
    }
  }

  public dumpPlayerState(): PlayerState {
    return {
      queue: this.playQueue.dump(),
      playbackMode: this.playbackMode,
      audioSrc: this.intendedAudioSrc || this.audio.src || '',
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTime: this.audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE ? this.currentTime : (this.audio.currentTime || this.currentTime),
      volume: this.audio.volume,
    };
  }

  public clearQueue() {
    this.currentLoadIntentId = null;
    this.playQueue.clear();
    this.clearAudioState();
  }

  private clearAudioState() {
    this.pause();

    this.audio.src = '';
    this.intendedAudioSrc = null;
    this.currentLoadIntentId = null;

    this.currentTime = 0;
    if (this.audio.readyState > 0 && this.audio.currentTime !== 0) {
      try {
        this.audio.currentTime = 0;
      } catch {
        console.warn('PlayerController.clearAudioState: 尝试将 currentTime 设置为 0 时发生错误。');
      }
    }

    this.isLoading = false;

    this.updateMediaSessionForTrack(null);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
    this.notifyStateChange();
  }

  private safeStr(val?: string | null): string {
    return val ?? '';
  }

  private initMediaSession() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());

    navigator.mediaSession.setActionHandler('seekbackward', (details) =>
      this.setCurrentTime(Math.max(0, this.audio.currentTime - (details?.seekOffset ?? 10))),
    );
    navigator.mediaSession.setActionHandler('seekforward', (details) =>
      this.setCurrentTime(Math.min(this.audio.duration || Infinity, this.audio.currentTime + (details?.seekOffset ?? 10))),
    );
  }

  private updateMediaSessionForTrack(track: TrackEntity | null) {
    if (!('mediaSession' in navigator)) return;

    if (track) {
      const cover_src_1 = track.cover_src ? [track.cover_src] : [];
      const artworkArr = cover_src_1.filter((u): u is string => !!u).map((u) => ({
        src: u,
        sizes: '512x512',
        type: 'image/png',
      }));

      if (artworkArr.length === 0) {
        artworkArr.push({
          src: 'core://assets/default-cover.png',
          sizes: '512x512',
          type: 'image/png',
        });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.safeStr(track.title),
        artist: this.safeStr(track.artist),
        album: this.safeStr(track.album),
        artwork: artworkArr,
      });
    } else {
      navigator.mediaSession.metadata = null;
    }
  }

  private startProgressTimer() {
    if (this.progressTimer !== null) return;
    this.progressTimer = window.setInterval(this.updateCurrentTimeAndPositionState, 500);
  }

  private stopProgressTimer() {
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  private updateCurrentTimeAndPositionState = () => {
    if (this.audio.paused && this.isPlaying) {
      this.isPlaying = false;
      this.stopProgressTimer();
    }

    if (!(this.audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && this.audio.readyState === HTMLMediaElement.HAVE_NOTHING)) {
      this.currentTime = this.audio.currentTime;
    }

    if ('mediaSession' in navigator) {
      const duration = this.audio.duration;
      if (!isNaN(duration) && isFinite(duration)) {
        navigator.mediaSession.setPositionState({
          duration,
          position: this.currentTime,
          playbackRate: this.audio.playbackRate,
        });
      } else if (navigator.mediaSession.playbackState !== 'none') {
        navigator.mediaSession.setPositionState({
          duration: 0,
          position: this.currentTime,
          playbackRate: this.audio.playbackRate,
        });
      }
    }
    this.notifyStateChange();
  };

  private setupEndedListener() {
    this.audio.removeEventListener('ended', this.onAudioEndedHandler);
    this.audio.addEventListener('ended', this.onAudioEndedHandler, { once: true });
  }

  private onAudioEndedHandler = () => {


    //向主进程发送统计信息(play_count++)
    libraryContext.increasePlayCount(this.playQueue.currentTrack);

    if (!this.intendedAudioSrc || (this.audio.src !== this.intendedAudioSrc && !this.audio.src.endsWith(this.intendedAudioSrc))) {
      console.warn('PlayerController.onAudioEnded: 事件针对已过时或非预期音轨。');
      return;
    }

    this.stopProgressTimer();
    this.isPlaying = false;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }

    console.log(`Player: 音轨 "${this.playQueue.currentTrack?.title || '未知音轨'}" 播放结束。尝试播放下一首。`);
    this.playNext().catch((error) => console.error('PlayerController: playNext() 失败:', error));
  };
}
