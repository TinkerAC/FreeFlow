import React, { useEffect } from 'react';
import useStateRef from 'react-usestateref';
import getAudioSrc from '@main/services/loadAudio';
import { PlayerState, TrackModel } from '@src/shared/types';
import { playerContext } from '@main/app/electronContextApi';

function usePlayer(audioRef: React.RefObject<HTMLAudioElement>) {
  // 统一的状态管理，新增 isLoading 用于显示加载状态
  const [, setPlayerState, playerStateRef] = useStateRef<PlayerState>({
    queue: [],
    volume: 0.5,
    indexList: [],
    currentIndex: 0,
    playbackMode: 'loop',
    audioSrc: '',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    currentTrackInfo: null,
    nextTracks: [],
  });

  // 工具函数：获取下一首、上一首索引
  const getNextIndex = (step = 1) => {
    return (playerStateRef.current.currentIndex + step) % playerStateRef.current.indexList.length;
  };

  const getPrevIndex = (step = 1) => {
    return (
      (playerStateRef.current.currentIndex - step + playerStateRef.current.indexList.length) %
      playerStateRef.current.indexList.length
    );
  };

  /** 播放控制方法 **/
  const play = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: true }));
  };

  const pause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: false }));
  };

  const togglePlayPause = () => {
    setPlayerState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const playNext = async () => {
    pause();
    if (playerStateRef.current.indexList.length === 0) return;

    // 开始加载下一首，设置 isLoading 为 true
    setPlayerState(prev => ({ ...prev, isLoading: true }));
    let attempts = 0;
    const maxAttempts = playerStateRef.current.indexList.length;

    while (attempts < maxAttempts) {
      const nextIndex = getNextIndex(attempts + 1);
      const nextTrack = playerStateRef.current.queue[playerStateRef.current.indexList[nextIndex]];
      let audioSrc: string;
      try {
        audioSrc = await getAudioSrc(nextTrack);
        // 成功获取音源后，更新状态并取消加载状态
        setPlayerState(prev => ({
          ...prev,
          isLoading: false,
          currentTime: 0,
          audioSrc,
          currentIndex: nextIndex,
        }));
        audioRef.current.addEventListener(
          'canplaythrough',
          () => {
            play();
          },
          { once: true },
        );
        break;
      } catch (error) {
        console.warn(`音频 ${nextTrack.title} 音源获取失败, 尝试下一首`);
        attempts++;

      }
    }

    if (attempts >= maxAttempts) {
      console.warn('所有曲目均无法播放');
      setPlayerState(prev => ({ ...prev, isLoading: false }));
    }
    console.log('播放下一首');
  };

  const playPrevious = async () => {
    pause();
    if (playerStateRef.current.indexList.length === 0) return;

    setPlayerState(prev => ({ ...prev, isLoading: true }));
    let attempts = 0;
    const maxAttempts = playerStateRef.current.indexList.length;

    while (attempts < maxAttempts) {
      const prevIndex = getPrevIndex(attempts + 1);
      const prevTrack = playerStateRef.current.queue[playerStateRef.current.indexList[prevIndex]];
      let audioSrc: string;
      try {
        audioSrc = await getAudioSrc(prevTrack);
        setPlayerState(prev => ({
          ...prev,
          isLoading: false,
          currentTime: 0,
          audioSrc,
          currentIndex: prevIndex,
        }));
        audioRef.current.addEventListener(
          'canplaythrough',
          () => {
            play();
          },
          { once: true },
        );
        break;
      } catch (error) {
        console.warn(`音频 ${prevTrack.title} 音源获取失败, 尝试下一首`);
        attempts++;

      }
    }

    if (attempts >= maxAttempts) {
      console.warn('所有曲目均无法播放');
      setPlayerState(prev => ({ ...prev, isLoading: false }));
    }
    console.log('播放上一首');
  };

  const setCurrentTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  // 改变音量，-1 <= volumeDiff <= 1
  const changeVolume = (volumeDiff: number) => {
    const newVolume = Math.max(0, Math.min(1, playerStateRef.current.volume + volumeDiff));
    setPlayerState(prev => ({ ...prev, volume: newVolume }));
  };

  /** 队列管理方法 **/
  const addTrackToEnd = (track: TrackModel) => {
    if (!track) return;
    setPlayerState(prev => {
      const newQueue = [...prev.queue, track];
      const newIndexList = [...prev.indexList, newQueue.length - 1];
      return { ...prev, queue: newQueue, indexList: newIndexList };
    });
  };

  const isTrackInQueue = (track: TrackModel) => {
    return playerStateRef.current.queue.some(
      item => item.platform === track.platform && item.platform_unique_id === track.platform_unique_id,
    );
  };

  const findTrackIndex = (track: TrackModel) => {
    return playerStateRef.current.queue.findIndex(
      item => item.platform === track.platform && item.platform_unique_id === track.platform_unique_id,
    );
  };

  const addTrackToNext = (track: TrackModel) => {
    if (!track) return;
    setPlayerState(prev => {
      let { queue, indexList } = prev;
      const currentIndex = prev.currentIndex;
      if (isTrackInQueue(track)) {
        const targetIndex = findTrackIndex(track);
        if (targetIndex === indexList[currentIndex]) {
          // 曲目已在当前播放位置
        } else {
          const updatedIndexList = [...indexList];
          const nextIndex = currentIndex + 1;
          const targetPositionInIndexList = updatedIndexList.indexOf(targetIndex);
          // 从原位置删除
          updatedIndexList.splice(targetPositionInIndexList, 1);
          // 插入到下一首位置
          updatedIndexList.splice(nextIndex, 0, targetIndex);
          indexList = updatedIndexList;
        }
      } else {
        // 添加新曲目到队列末尾并插入到下一首位置
        queue = [...queue, track];
        const updatedIndexList = [...indexList];
        updatedIndexList.splice(currentIndex + 1, 0, queue.length - 1);
        indexList = updatedIndexList;
      }
      return { ...prev, queue, indexList };
    });
  };

  const replacePlayQueue = async (tracks: TrackModel[]) => {
    pause();
    let newIndexList;
    switch (playerStateRef.current.playbackMode) {
      case 'loop':
        newIndexList = tracks.map((_, i) => i);
        break;
      case 'shuffle':
        newIndexList = tracks.map((_, i) => i).sort(() => Math.random() - 0.5);
        break;
      case 'repeat':
        newIndexList = [0];
        break;
      default:
        newIndexList = tracks.map((_, i) => i);
    }
    setPlayerState(prev => ({
      ...prev,
      queue: tracks,
      indexList: newIndexList,
      currentIndex: 0,
      isLoading: true,
    }));

    const initialTrack = tracks[newIndexList[0]];
    let audioSrc: string;
    try {
      audioSrc = await getAudioSrc(initialTrack);
      setPlayerState(prev => ({ ...prev, audioSrc, isLoading: false }));
      audioRef.current.addEventListener(
        'canplaythrough',
        () => {
          play();
        },
        { once: true },
      );
    } catch (error) {
      console.warn(`音频 ${initialTrack.title} 音源获取失败, 尝试下一首`);
      await playNext();
    }
  };

  /** 播放模式管理方法 **/
  const cyclePlaybackMode = () => {
    const MODES: ['loop', 'repeat', 'shuffle'] = ['loop', 'repeat', 'shuffle'];
    const currentModeIndex = MODES.indexOf(playerStateRef.current.playbackMode);
    const nextMode: 'loop' | 'repeat' | 'shuffle' = MODES[(currentModeIndex + 1) % MODES.length];
    setPlayerState(prev => {
      const playingIndex = prev.indexList[prev.currentIndex];
      let newIndexList;
      switch (nextMode) {
        case 'loop':
          newIndexList = prev.queue.map((_, i) => i);
          break;
        case 'shuffle':
          newIndexList = prev.queue.map((_, i) => i).sort(() => Math.random() - 0.5);
          break;
        case 'repeat':
          newIndexList = [playingIndex];
          break;
        default:
          newIndexList = prev.indexList;
      }
      const newCurrentIndex = newIndexList.indexOf(playingIndex);
      return {
        ...prev,
        playbackMode: nextMode,
        indexList: newIndexList,
        currentIndex: newCurrentIndex,
      };
    });
  };

  // 自动更新下一首曲目列表
  useEffect(() => {
    if (playerStateRef.current.queue.length === 0) {
      setPlayerState(prev => ({ ...prev, nextTracks: [] }));
    } else {
      const nextIndices = playerStateRef.current.indexList.slice(
        playerStateRef.current.currentIndex + 1,
      );
      const nextTracks = nextIndices.map(index => playerStateRef.current.queue[index]);
      setPlayerState(prev => ({ ...prev, nextTracks }));
    }
  }, [
    playerStateRef.current.queue,
    playerStateRef.current.indexList,
    playerStateRef.current.currentIndex,
  ]);

  // 自动更新 currentTrackInfo
  useEffect(() => {
    if (playerStateRef.current.queue.length > 0) {
      const currentTrack =
        playerStateRef.current.queue[
          playerStateRef.current.indexList[playerStateRef.current.currentIndex]
          ];
      setPlayerState(prev => ({ ...prev, currentTrackInfo: currentTrack }));
    } else {
      setPlayerState(prev => ({ ...prev, currentTrackInfo: null }));
    }
  }, [
    playerStateRef.current.queue[playerStateRef.current.indexList[playerStateRef.current.currentIndex]],
  ]);

  // 加载播放器状态
  useEffect(() => {
    const loadPlayerState = async () => {
      try {
        const savedState = await playerContext.getPlayerState();
        console.log('加载播放器状态:', savedState);
        if (savedState) {
          const currentTrack = savedState.queue[savedState.indexList[savedState.currentIndex]];
          setPlayerState(prev => ({ ...prev, isLoading: true }));
          const audioSrc = await getAudioSrc(currentTrack);
          setPlayerState({
            ...savedState,
            audioSrc,
            currentTrackInfo: currentTrack,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Failed to load playerContext state:', error);
      }
    };
    loadPlayerState().then();
  }, []);

  // 初始化音频设置
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener(
        'canplaythrough',
        () => {
          audioRef.current.currentTime = playerStateRef.current.currentTime;
          audioRef.current.volume = playerStateRef.current.volume;
        },
        { once: true },
      );
    }
  }, []);

  // 更新音频源
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = playerStateRef.current.audioSrc;
    }
  }, [playerStateRef.current.audioSrc]);

  // 定期更新 currentTime
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRef.current && playerStateRef.current.isPlaying) {
        setPlayerState(prev => ({
          ...prev,
          currentTime: audioRef.current.currentTime,
        }));
      }
    }, 333);
    return () => clearInterval(interval);
  }, [playerStateRef.current.isPlaying]);

  // 同步音量和 audio 元素
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = playerStateRef.current.volume;
    }
  }, [playerStateRef.current.volume]);

  // 同步播放状态和 audio 元素
  useEffect(() => {
    if (audioRef.current) {
      if (playerStateRef.current.isPlaying) {
        audioRef.current.play().then();
      } else {
        audioRef.current.pause();
      }
    }
  }, [playerStateRef.current.isPlaying]);

  // 处理音频结束事件
  useEffect(() => {
    const handleEnded = () => {
      playNext().then();
    };
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleEnded);
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, [audioRef]);

  // 导出播放器状态
  const dumpPlayerState = (): PlayerState => {
    return {
      ...playerStateRef.current,
      isPlaying: false,
      queue: playerStateRef.current.queue,
      volume: audioRef.current ? audioRef.current.volume : playerStateRef.current.volume,
    };
  };

  // 清空播放队列
  const clearQueue = () => {
    setPlayerState({
      ...playerStateRef.current,
      queue: [],
      indexList: [],
      currentIndex: 0,
      audioSrc: '',
      isPlaying: false,
      currentTime: 0,
    });
  };

  // 挂载到全局 window 对象上, 方便调试
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  window.playerState = dumpPlayerState;

  return {
    playerStateRef,
    play,
    pause,
    togglePlayPause,
    playNext,
    playPrevious,
    setCurrentTime,
    setVolume: (volume: number) => setPlayerState(prev => ({ ...prev, volume })),
    changeVolume,
    addTrackToEnd,
    addTrackToNext,
    replacePlayQueue,
    cyclePlaybackMode,
    dumpPlayerState,
    clearQueue,
    addToNextAndPlay: (track: TrackModel) => {
      addTrackToNext(track);
      playNext().then();
    },
    addToNext: (track: TrackModel) => {
      addTrackToNext(track);
    },
    setCurrentTrackInfoDuration: (duration: number) => {
      setPlayerState(prev => ({
        ...prev,
        currentTrackInfo: Object.assign({}, prev.currentTrackInfo, { duration }),
      }));
    },
  };
}

export default usePlayer;