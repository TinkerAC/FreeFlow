// file: src/renderer/core/PlayQueue.ts
import { TrackModel } from '@src/shared/types';

export interface QueueDump {
  queue: TrackModel[];
  indexList: number[];
  currentIndex: number;
}

export class PlayQueue {
  private queueLibrary: TrackModel[] = [];
  private indexList: number[] = [];
  private currentIndex = 0;

  /** 或者直接暴露成动态属性 */
  public get currentTrack(): TrackModel | null {
    if (!this.indexList.length) return null;
    const libIdx = this.indexList[this.currentIndex];
    return this.queueLibrary[libIdx] || null;
  }

  /** 剩余未播放的曲目列表，按播放顺序 */
  public get remainingTracks(): TrackModel[] {
    return this.indexList
      .slice(this.currentIndex + 1)
      .map((libIdx) => this.queueLibrary[libIdx]);
  }

  public get isEmpty() {
    return this.queueLibrary.length == 0;
  }

  /** 从 dump 恢复整个队列状态 */
  public loadFromDump(dump: QueueDump) {
    this.queueLibrary = dump.queue;
    this.indexList = dump.indexList;
    this.currentIndex = dump.currentIndex;
  }

  /** 在“下一首”位置添加：原方法 */
  public addTrackToNextInQueue(track: TrackModel) {
    const exists = this.findTrackIndexInQueueLibrary(track);
    if (exists === -1) {
      const newLength = this.queueLibrary.push(track);
      const newIndex = newLength - 1;
      this.indexList.splice(this.currentIndex + 1, 0, newIndex);
    } else {
      this.indexList.splice(this.currentIndex + 1, 0, exists);
    }
  }

  /** 导出当前队列状态 dump */
  public dump(): QueueDump {
    return {
      queue: [...this.queueLibrary],
      indexList: [...this.indexList],
      currentIndex: this.currentIndex,
    };
  }

  /** 获取“下一首”——原方法 */
  public getNextTrack(step = 1): TrackModel | null {
    const nextId = this.indexList.length
      ? (this.currentIndex + step) % this.indexList.length
      : 0;
    return this.queueLibrary[this.indexList[nextId]] || null;
  }

  /** 获取“上一首”——原方法（名称调整为 getPrevTrack） */
  public getPrevTrack(step = 1): TrackModel | null {
    const prevId = this.indexList.length
      ? (this.currentIndex - step + this.indexList.length) % this.indexList.length
      : 0;
    return this.queueLibrary[this.indexList[prevId]] || null;
  }

  /** 备用版本：与 addTrackToNextInQueue 等价，只是内部写法不同 */
  public _addTrackToNextInQueue(track: TrackModel, playBackMode: 'loop' | 'repeat' | 'shuffle') {


    const trackIdxInLib = this.findTrackIndexInQueueLibrary(track);

    if (
      playBackMode === 'repeat'
    ) {
      this.indexList = [trackIdxInLib];
    }

    if (trackIdxInLib !== -1) {
      const pos = this.indexList.indexOf(trackIdxInLib);
      if (pos !== -1) this.indexList.splice(pos, 1);
      this.indexList.splice(this.currentIndex + 1, 0, trackIdxInLib);
    } else {
      this.queueLibrary.push(track);
      this.indexList.splice(this.currentIndex + 1, 0, this.queueLibrary.length - 1);
    }
  }

  /**
   * 切到指定曲目（必须在队列中）
   * @param track
   */
  public switchToTrack(track: TrackModel) {
    const idx = this.findTrackIndexInQueueLibrary(track);
    if (idx === -1) {
      console.warn('Track not found in playQueue');
      return;
    }
    const playIdx = this.indexList.indexOf(idx);
    if (playIdx === -1) {
      console.warn('Track exists in library but not in播放索引列表');
      return;
    }
    this.currentIndex = playIdx;
  }

  /**
   * 重建播放顺序,需要保留当前播放曲目的位置正确.
   * @param playbackMode 'loop' | 'repeat' | 'shuffle'
   */
  public rebuildIndexList(playbackMode: 'loop' | 'repeat' | 'shuffle') {

    const currentTrack = this.currentTrack;
    let curLibIdx: number | null = null;

    currentTrack && (curLibIdx = this.findTrackIndexInQueueLibrary(currentTrack));

    console.debug('RebuildIndexList,curLibIdx:', curLibIdx, this.currentTrack);

    if (curLibIdx === -1) return;

    this.generateNewIndexList(
      playbackMode,
      this.queueLibrary.length,
      curLibIdx || 0,
    );
    if (
      curLibIdx != null) {
      this.currentIndex = this.indexList.indexOf(curLibIdx);
    }

  }

  /**
   * 整体替换 library 并重建索引
   * @param tracks 新的曲目列表
   * @param playbackMode 播放模式
   */
  public replaceQueueLibraryAndIndexList(
    tracks: TrackModel[],
    playbackMode: 'loop' | 'repeat' | 'shuffle',
  ) {
    this.queueLibrary = [...tracks];
    this.rebuildIndexList(playbackMode);
    this.currentIndex = 0;
  }

  /** 获取队头曲目 */
  public getHeadTrack(): TrackModel | null {
    return this.queueLibrary[this.indexList[0]] || null;
  }

  /** 清空队列 */
  public clear() {
    this.queueLibrary = [];
    this.indexList = [];
    this.currentIndex = 0;
  }

  /** 切到下一首（并更新 currentIndex） */
  public moveNext(step = 1): void {
    if (!this.indexList.length) return;
    this.currentIndex =
      (this.currentIndex + step) % this.indexList.length;
  }

  // ===== 新增的动态属性，无需手动维护 =====

  /** 切到上一首 */
  public movePrev(step = 1): void {
    if (!this.indexList.length) return;
    this.currentIndex =
      (this.currentIndex - step + this.indexList.length) %
      this.indexList.length;
  }

  /**
   * 找到给定曲目在 library 中的索引
   * @param track
   */
  private findTrackIndexInQueueLibrary(track: TrackModel): number {
    return this.queueLibrary.findIndex(item =>
      item.platform === track.platform &&
      item.platform_unique_id === track.platform_unique_id,
    );

  }

  private generateNewIndexList(playbackMode: 'loop' | 'repeat' | 'shuffle', queueLibraryLength: number, repeatLibIdx: number = null) {

    switch (playbackMode) {
      case 'loop':
        this.indexList = this.queueLibrary.map((_, i) => i);
        break;
      case 'shuffle':
        this.indexList = this.queueLibrary
          .map((_, i) => i)
          .sort(() => Math.random() - 0.5);
        break;
      case 'repeat':
        if (repeatLibIdx === null) {
          console.error('未为repeat曲目提供索引');
        }
        this.indexList = [repeatLibIdx];
        break;
    }

  }
}