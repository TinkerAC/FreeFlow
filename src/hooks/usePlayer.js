import {useEffect} from 'react';
import useStateRef from 'react-usestateref';
import getAudioSrc from '../services/loadAudio.js';

// 辅助函数：获取曲目信息
async function fetchTrackInfo(file_path, data_href) {
    return await window.playerAPI.getTrackInfo(file_path, data_href);
}

function usePlayer(audioRef) {
    // 状态管理
    const [queue, setQueue, queueRef] = useStateRef([]);
    const [indexList, setIndexList, indexListRef] = useStateRef([]);
    const [currentIndex, setCurrentIndex, currentIndexRef] = useStateRef(0);
    const [playbackMode, setPlaybackMode, playbackModeRef] = useStateRef('loop');
    const [audioSrc, setAudioSrc, audioSrcRef] = useStateRef('');
    const [isPlaying, setIsPlaying, isPlayingRef] = useStateRef(false);
    const [currentTime, setCurrentTime, currentTimeRef] = useStateRef(0);
    const [currentTrackInfo, setCurrentTrackInfo, currentTrackInfoRef] = useStateRef({});
    const [nextTracks, setNextTracks, nextTracksRef] = useStateRef([]);
    const [volume, setVolume, volumeRef] = useStateRef(0.5);

    /** 播放控制方法 **/
    const play = () => {
        audioRef.current.play();
        setIsPlaying(true);
    };

    const pause = () => {
        audioRef.current.pause();
        setIsPlaying(false);
    };

    const togglePlayPause = () => {
        if (audioRef.current.paused) {
            play();
        } else {
            pause();
        }
    };

    const playNext = async () => {
        if (isPlayingRef.current) {
            pause();
        }

        if (indexListRef.current.length === 0) return;
        const nextIndex = (currentIndexRef.current + 1) % indexListRef.current.length;
        setCurrentIndex(nextIndex);

        const nextTrack = queueRef.current[indexListRef.current[nextIndex]];
        setAudioSrc(await getAudioSrc(nextTrack));
        setCurrentTime(0);

        audioRef.current.addEventListener('canplaythrough', play, {once: true});
    };

    const playPrevious = async () => {
        if (indexListRef.current.length === 0) return;

        const prevIndex = (currentIndexRef.current - 1 + indexListRef.current.length) % indexListRef.current.length;
        setCurrentIndex(prevIndex);

        const prevTrack = queueRef.current[indexListRef.current[prevIndex]];
        setAudioSrc(await getAudioSrc(prevTrack));
        setCurrentTime(0);

        audioRef.current.addEventListener('canplaythrough', play, {once: true});
    };

    const seekTo = (time) => {
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };


    //改变音量, -1 <= volumeDiff <= 1
    const changeVolume = (volumeDiff) => {
        const newVolume = Math.max(0, Math.min(1, volumeRef.current + volumeDiff));
        setVolume(newVolume);
    }


    /** 队列管理方法 **/
    const addTrackToEnd = (track) => {
        if (!track) return;

        setQueue([...queueRef.current, track]);
        setIndexList([...indexListRef.current, queueRef.current.length]);
    };

    const isTrackInQueue = (track) => {
        return queueRef.current.some(
            (item) => item.file_path === track.file_path && item.data_href === track.data_href
        );
    };

    const findTrackIndex = (track) => {
        return queueRef.current.findIndex(
            (item) => item.file_path === track.file_path && item.data_href === track.data_href
        );
    };

    const addTrackToNext = (track) => {
        if (!track) return;

        if (isTrackInQueue(track)) {
            const targetIndex = findTrackIndex(track);

            if (targetIndex === indexListRef.current[currentIndexRef.current]) {
                // 曲目已在当前播放位置
                return;
            } else {
                // 将曲目移动到下一首位置
                const updatedIndexList = [...indexListRef.current];
                const nextIndex = currentIndexRef.current + 1;

                const targetPositionInIndexList = indexListRef.current.indexOf(targetIndex);
                // 从原位置删除
                updatedIndexList.splice(targetPositionInIndexList, 1);
                // 插入到下一首位置
                updatedIndexList.splice(nextIndex, 0, targetIndex);

                setIndexList(updatedIndexList);
            }
        } else {
            // 添加新曲目到队列末尾并插入到下一首位置
            setQueue([...queueRef.current, track]);

            const updatedIndexList = [...indexListRef.current];
            updatedIndexList.splice(currentIndexRef.current + 1, 0, queueRef.current.length - 1);
            setIndexList(updatedIndexList);
        }
    };

    const replacePlayQueue = async (tracks) => {
        setQueue(tracks);
        setIndexList(Array.from({length: tracks.length}, (_, i) => i));
        setCurrentIndex(0);

        const initialTrack = tracks[0];
        setAudioSrc(await getAudioSrc(initialTrack));
        setCurrentTrackInfo(initialTrack);

        audioRef.current.addEventListener('canplaythrough', play, {once: true});
    };

    /** 播放模式管理方法 **/
    const cyclePlaybackMode = () => {
        const MODES = ['loop', 'repeat', 'shuffle'];
        const currentModeIndex = MODES.indexOf(playbackModeRef.current);
        const nextMode = MODES[(currentModeIndex + 1) % MODES.length];
        setPlaybackMode(nextMode);

        const playingIndex = indexListRef.current[currentIndexRef.current];

        let newIndexList;

        switch (nextMode) {
            case 'loop':
                newIndexList = Array.from({length: queueRef.current.length}, (_, i) => i);
                break;
            case 'shuffle':
                newIndexList = Array.from({length: queueRef.current.length}, (_, i) => i).sort(() => Math.random() - 0.5);
                break;
            case 'repeat':
                newIndexList = [playingIndex];
                break;
            default:
                newIndexList = indexListRef.current;
        }

        const newCurrentIndex = newIndexList.indexOf(playingIndex);
        setIndexList(newIndexList);
        setCurrentIndex(newCurrentIndex);
    };


    // 更新下一首曲目列表
    useEffect(() => {
        if (queueRef.current.length === 0) {
            setNextTracks([]);
        } else {
            const nextIndices = indexListRef.current.slice(currentIndexRef.current + 1);
            const nextTracks = nextIndices.map(index => queueRef.current[index]);
            setNextTracks(nextTracks);
        }
    }, [queueRef.current, indexListRef.current, currentIndexRef.current]);

    // 更新当前曲目信息
    useEffect(() => {
        if (queueRef.current.length > 0) {
            const currentTrack = queueRef.current[indexListRef.current[currentIndexRef.current]];
            setCurrentTrackInfo(currentTrack);
        } else {
            setCurrentTrackInfo({});
        }
    }, [queueRef.current, indexListRef.current, currentIndexRef.current]);


    // 加载播放器状态
    useEffect(() => {
        const loadPlayerState = async () => {
            try {
                const playerState = await window.playerAPI.getPlayerState();
                if (playerState) {
                    // 补全曲目信息
                    for (let track of playerState.queue) {
                        const trackInfo = await fetchTrackInfo(track.file_path, track.data_href);
                        Object.assign(track, trackInfo);
                    }

                    setQueue(playerState.queue);
                    setIndexList(playerState.indexList);
                    setCurrentIndex(playerState.currentIndex);
                    setPlaybackMode(playerState.playbackMode);
                    setIsPlaying(playerState.isPlaying);
                    setCurrentTime(playerState.currentTime);
                    changeVolume(playerState.volume);

                    const currentTrack = playerState.queue[playerState.indexList[playerState.currentIndex]];
                    setAudioSrc(await getAudioSrc(currentTrack));
                    setCurrentTrackInfo(currentTrack);
                }
            } catch (error) {
                console.error('Failed to load player state:', error);
            }
        };

        loadPlayerState();
    }, []);

    // 更新音频源
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.src = audioSrcRef.current;
        }
    }, [audioSrcRef]);

    // 定时更新播放时间
    useEffect(() => {
        const interval = setInterval(() => {
            if (audioRef.current && isPlayingRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlayingRef]);

    //绑定volume和audioRef.current.volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volumeRef.current;
        }
    }, [volumeRef.current]);


    // 处理音频结束事件
    useEffect(() => {
        const handleEnded = () => {
            playNext();
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
    const dumpPlayerState = () => {
        return {
            queue: queueRef.current.map(track => ({file_path: track.file_path, data_href: track.data_href})),
            indexList: indexListRef.current,
            currentIndex: currentIndexRef.current,
            isPlaying: isPlayingRef.current,
            currentTime: currentTimeRef.current,
            playbackMode: playbackModeRef.current,
            volume: audioRef.current.volume,
        };
    };

    // 清空播放队列
    const clearQueue = () => {
        setQueue([]);
        setIndexList([]);
        setCurrentIndex(0);
        setAudioSrc('');
        setIsPlaying(false);
        setCurrentTime(0);
    };


    return {
        // 状态引用
        queueRef,
        currentIndexRef,
        audioSrcRef,
        isPlayingRef,
        currentTimeRef,
        playbackModeRef,
        currentTrackInfoRef,
        nextTracksRef,
        volumeRef,
        // 播放控制方法
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        setVolume,
        changeVolume,
        // 队列管理方法
        addTrackToEnd,
        addTrackToNext,
        replacePlayQueue,
        // 播放模式方法
        cyclePlaybackMode,
        // 其他方法
        dumpPlayerState,
        clearQueue,
        //遗留的老方法
        addToNextAndPlay: (track) => {
            addTrackToNext(track);
            playNext();
        },
        addToNext: (track) => {
            addTrackToNext(track);
        },
        setCurrentTrackInfo: (track) => {
            setCurrentTrackInfo(track);
        }
    };
}

export default usePlayer;
