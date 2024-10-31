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

    //Utils
    const getNextIndex = () => {
        return (currentIndexRef.current + 1) % indexListRef.current.length;
    }

    const getPrevIndex = () => {
        return (currentIndexRef.current - 1 + indexListRef.current.length) % indexListRef.current.length;
    }


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
        if (indexListRef.current.length === 0) return;

        let attempts = 0;
        const maxAttempts = indexListRef.current.length; // 防止无限循环

        while (attempts < maxAttempts) {
            const nextIndex = getNextIndex(); // 确保 getNextIndex() 已正确定义
            setCurrentIndex(nextIndex);


            const nextTrack = queueRef.current[indexListRef.current[nextIndex]];

            const expectedNextTrack = {
                ...queueRef.current[indexListRef.current[nextIndex]]
            };


            let audioSrc;

            try {
                audioSrc = await getAudioSrc(nextTrack);
            } catch (error) {
                console.error('获取音频BlobUrl时出错:', error);
                attempts++;
                continue; // 跳过本次循环，尝试下一个曲目
            }


            // 检查在异步操作期间，曲目是否已被用户切换
            if (expectedNextTrack.track_id !== currentTrackInfoRef.current.track_id) {
                console.error(`用户已切换曲目expected:${expectedNextTrack.track_id} current:${currentTrackInfoRef.current.track_id}`);
                // 用户已切换曲目，停止当前操作
                return;
            }

            // 成功获取音频源，更新状态并开始播放
            setCurrentTime(0);
            setAudioSrc(audioSrc);

            audioRef.current.addEventListener('canplaythrough', () => {
                play();
            }, {once: true});

            break; // 成功播放，跳出循环
        }

        if (attempts >= maxAttempts) {
            console.warn('所有曲目均无法播放');
            // 可以通知用户或执行其他操作
        }
        console.log("播放下一首")
        console.log(dumpPlayerState())
    };


    const playPrevious = async () => {
        if (indexListRef.current.length === 0) return;

        let attempts = 0;
        const maxAttempts = indexListRef.current.length; // 防止无限循环

        while (attempts < maxAttempts) {
            const prevIndex = getNextIndex()
            setCurrentIndex(prevIndex);


            const prevTrack = queueRef.current[indexListRef.current[prevIndex]];


            const expectedPrevTrack = {
                ...queueRef.current[indexListRef.current[prevIndex]]
            };


            let audioSrc;

            try {
                audioSrc = await getAudioSrc(prevTrack);
            } catch (error) {
                console.error('获取音频BlobUrl时出错:', error);
                attempts++;
                continue; // 跳过本次循环，尝试上一个曲目
            }

            // 检查在异步操作期间，曲目是否已被用户切换
            if (expectedPrevTrack.track_id !== currentTrackInfoRef.current.track_id) {
                // 用户已切换曲目，停止当前操作
                return;
            }

            // 成功获取音频源，更新状态并开始播放
            setCurrentTime(0);
            setAudioSrc(audioSrc);

            audioRef.current.addEventListener('canplaythrough', () => {
                play();
            }, {once: true});

            break; // 成功播放，跳出循环
        }

        if (attempts >= maxAttempts) {
            console.warn('所有曲目均无法播放');
            // 可以通知用户或执行其他操作
        }
        console.log("播放上一首")
        console.log(dumpPlayerState())

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
        // 更新队列
        setQueue(tracks);

        // 根据当前播放模式设置 indexList
        let newIndexList;
        switch (playbackModeRef.current) {
            case 'loop':
                newIndexList = Array.from({length: tracks.length}, (_, i) => i);
                break;
            case 'shuffle':
                newIndexList = Array.from({length: tracks.length}, (_, i) => i).sort(() => Math.random() - 0.5);
                break;
            case 'repeat':
                newIndexList = [0];
                break;
            default:
                newIndexList = Array.from({length: tracks.length}, (_, i) => i);
        }
        setIndexList(newIndexList);

        // 设置当前索引为 0
        setCurrentIndex(0);

        // 获取初始曲目
        const initialTrack = queueRef.current[indexListRef.current[currentIndexRef.current]];
        let audioSrc;

        try {
            audioSrc = await getAudioSrc(initialTrack);
            setAudioSrc(audioSrc);
            audioRef.current.src = audioSrc;

            // 更新当前曲目信息
            setCurrentTrackInfo(initialTrack);

            // 监听 canplaythrough 事件，播放音频
            audioRef.current.addEventListener('canplaythrough', () => {
                play();
            }, {once: true});
        } catch (error) {
            console.error('获取音频BlobUrl时出错:', error);
            // 尝试播放下一首
            await playNext();
        }
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


    // 自动更新下一首曲目列表
    useEffect(() => {
        if (queueRef.current.length === 0) {
            setNextTracks([]);
        } else {
            const nextIndices = indexListRef.current.slice(currentIndexRef.current + 1);
            const nextTracks = nextIndices.map(index => queueRef.current[index]);
            setNextTracks(nextTracks);
        }
    }, [queueRef.current, indexListRef.current, currentIndexRef.current]);

    // 自动跟新当前曲目信息
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
                    setVolume(playerState.volume);

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

    //初始化的一部分
    //当音频初始化加载完成后,将playerState的currentTime应用到audioRef.current.currentTime,将playerState的volume应用到audioRef.current.volume
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.addEventListener('canplaythrough', () => {
                audioRef.current.currentTime = currentTimeRef.current;
                setVolume(volumeRef.current);
                audioRef.current.volume = volumeRef.current;
            }, {once: true});
        }
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
            isPlaying: false,
            currentTime: currentTimeRef.current,
            playbackMode: playbackModeRef.current,
            volume: audioRef.current.volume,
            currentTrackInfo: currentTrackInfoRef.current,
            audioSrc: audioSrcRef.current
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


    window.playerState = dumpPlayerState;


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
