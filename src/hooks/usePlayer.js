import {useEffect} from 'react';
import useStateRef from "react-usestateref";
import getAudioSrc from "../services/loadAudio.js";

// Helper function to fetch track information
async function fetchTrackInfo(file_path) {
    return await window.playerAPI.getTrackInfo(file_path);
}


// 管理播放队列的 Hook
function useQueue() {
    const [queue, setQueue, queueRef] = useStateRef([]);
    const [indexList, setIndexList, indexListRef] = useStateRef([]);
    const [currentIndex, setCurrentIndex, currentIndexRef] = useStateRef(0);

    const addTrackToEndInQueue = (track) => {
        if (!track) return;

        const updatedQueue = [...queueRef.current, track];
        setQueue(updatedQueue);

        const newIndex = queueRef.current.length;
        setIndexList([...indexListRef.current, newIndex]);
    };


    const findIndex = (track) => {
        return queueRef.current.findIndex(item => item.file_path === track.file_path && item.dataHref === track.data_href);
    }

    const swapElements = (array, index1, index2) => {
        if (index1 !== index2 && index1 >= 0 && index1 < array.length && index2 >= 0 && index2 < array.length) {
            // 使用临时变量交换
            const temp = array[index1];
            array[index1] = array[index2];
            array[index2] = temp;
        }
    };


    const addTrackToNextInQueue = (track) => {
        if (!track) return;

        if (isExistedInQueue(track)) {

            console.log("曲目已存在于播放队列中");

            const targetIndex = findIndex(track);

            if (targetIndex === currentIndexRef.current) {
                console.log("曲目已在播放队列中且正在播放，不做任何操作");

            } else {
                const updatedIndexList = [...indexListRef.current];
                const nextIndex = currentIndexRef.current + 1;

                swapElements(updatedIndexList,nextIndex,targetIndex);

                setIndexList(updatedIndexList);
                console.log("曲目已在播放队列中，移动到当前曲目之后", 'queue', queueRef.current, 'indexList', indexListRef.current, 'currentIndex', currentIndexRef.current);

            }


        } else {
            //将track 添加到queue 末 并将index 插入到indexList后一位

            const nextIndex = currentIndexRef.current + 1;

            const updatedQueue = [...queueRef.current, track];
            setQueue(updatedQueue);

            const updatedIndexList = [...indexListRef.current];
            updatedIndexList.splice(nextIndex, 0, updatedQueue.length - 1);
            setIndexList(updatedIndexList);
            console.log("at addTrackToNextInQueue", 'queue', queueRef.current, 'indexList', indexListRef.current, 'currentIndex', currentIndexRef.current);
        }
    };

    const replacePlayQueue = (tracks) => {
        setQueue(tracks);
        setIndexList(Array.from({length: tracks.length}, (_, i) => i));
        setCurrentIndex(0);
    };

    const isExistedInQueue = (track) => {
        return queueRef.current.some(item => item.file_path === track.file_path && item.data_href === track.data_href);
    };

    return {
        queueRef,
        indexListRef,
        currentIndexRef,
        setQueue,
        setIndexList,
        setCurrentIndex,
        addTrackToEndInQueue,
        addTrackToNextInQueue,
        replacePlayQueue,
        isExistedInQueue,
    };
}

// 管理播放控制的 Hook
function usePlaybackControl(audioRef, queueRef, indexListRef, currentIndexRef, setCurrentIndex, addTrackToEndInQueue, addTrackToNextInQueue) {
    const [audioSrc, setAudioSrc, audioSrcRef] = useStateRef('');
    const [isPlaying, setIsPlaying, isPlayingRef] = useStateRef(false);
    const [currentTime, setCurrentTime, currentTimeRef] = useStateRef(0);

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

    const changeVolume = (volume) => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    };

    const addToNext = (track) => {
        addTrackToNextInQueue(track);
    };

    const addToNextAndPlay = async (track) => {
        addTrackToNextInQueue(track);
        playNext();
    };

    return {
        audioSrcRef,
        isPlayingRef,
        currentTimeRef,
        setAudioSrc,
        setIsPlaying,
        setCurrentTime,
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        changeVolume,
        addToNext,
        addToNextAndPlay,
    };
}

// Hook to manage playback mode
function usePlaybackMode(queueRef, indexListRef, currentIndexRef, setIndexList, setCurrentIndex) {
    const [playbackMode, setPlaybackMode, playbackModeRef] = useStateRef('loop');
    const [nextTracks, setNextTracks, nextTracksRef] = useStateRef([]);

    const calculateNextTracks = (queue, indexList, currentIndex) => {
        if (queue.length === 0) return [];
        if (currentIndex === queue.length - 1) {
            return indexList.map(index => queue[index]);
        } else {
            return indexList.slice(currentIndex + 1).map(index => queue[index]);
        }
    };

    const cyclePlaybackMode = () => {
        const MODES = ['loop', 'repeat', 'shuffle'];
        const nextMode = MODES[(MODES.indexOf(playbackModeRef.current) + 1) % MODES.length];

        const playingIndex = indexListRef.current[currentIndexRef.current];

        let newIndexList;
        let newCurrentIndex;

        switch (nextMode) {
            case 'loop':
                newIndexList = Array.from({length: queueRef.current.length}, (_, i) => i);
                newCurrentIndex = newIndexList.indexOf(playingIndex);
                break;
            case 'shuffle':
                newIndexList = Array.from({length: queueRef.current.length}, (_, i) => i).sort(() => Math.random() - 0.5);
                newCurrentIndex = newIndexList.indexOf(playingIndex);
                break;
            case 'repeat':
                newIndexList = [playingIndex];
                newCurrentIndex = 0;
                break;
            default:
                console.error('Unknown mode:', nextMode);
                return;

        }

        setIndexList(newIndexList);
        setCurrentIndex(newCurrentIndex);
        setPlaybackMode(nextMode);
        setNextTracks(calculateNextTracks(queueRef.current, newIndexList, newCurrentIndex));

        console.log('切换播放模式:', nextMode, 'queue', queueRef.current, '新的 indexList:', newIndexList, '新的 currentIndex:', newCurrentIndex);
    };

    useEffect(() => {
        setNextTracks(calculateNextTracks(queueRef.current, indexListRef.current, currentIndexRef.current));
    }, [queueRef.current, indexListRef.current, currentIndexRef.current]);

    return {
        playbackModeRef,
        nextTracksRef,
        cyclePlaybackMode,
        setPlaybackMode
    };
}

// Hook to manage track information
function useTrackInfo(audioRef, queueRef, indexListRef, currentIndexRef, setCurrentTrackInfo) {
    useEffect(() => {
        if (audioRef.current) {
            const track = queueRef.current[indexListRef.current[currentIndexRef.current]];
            setCurrentTrackInfo(track);
        }
    }, [queueRef.current, indexListRef.current, currentIndexRef.current]);
}

// The main usePlayer hook
function usePlayer(audioRef) {
    const {
        queueRef,
        indexListRef,
        currentIndexRef,
        setQueue,
        setIndexList,
        setCurrentIndex,
        addTrackToEndInQueue,
        replacePlayQueue,
        isExistedInQueue,
        addTrackToNextInQueue,
    } = useQueue();

    const {
        audioSrcRef,
        isPlayingRef,
        currentTimeRef,
        setAudioSrc,
        setIsPlaying,
        setCurrentTime,
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        changeVolume,
        addToNext,
        addToNextAndPlay
    } = usePlaybackControl(audioRef, queueRef, indexListRef, currentIndexRef, setCurrentIndex, addTrackToEndInQueue, addTrackToNextInQueue);

    const {
        playbackModeRef,
        nextTracksRef,
        cyclePlaybackMode,
        setPlaybackMode
    } = usePlaybackMode(queueRef, indexListRef, currentIndexRef, setIndexList, setCurrentIndex);

    const [currentTrackInfo, setCurrentTrackInfo, currentTrackInfoRef] = useStateRef({});

    useTrackInfo(audioRef, queueRef, indexListRef, currentIndexRef, setCurrentTrackInfo);

    // 从本地 dump 文件加载播放器状态
    useEffect(() => {
        const completeTrackInfo = async (playerState) => {
            // 每次 dump 仅保留资源 url, 所以需要再加载的时候为队列中的每个歌曲重新获取完整信息
            for (const track of playerState.queue) {
                const trackInfo = await fetchTrackInfo(track.file_path);
                track.title = trackInfo.title;
                track.artist = trackInfo.artist;
                track.album = trackInfo.album;
                track.duration = trackInfo.duration;
                track.cover_src = trackInfo.cover_src;
            }
        };
        const loadPlayer = async () => {
            try {
                const playerState = await window.playerAPI.getPlayerState();
                console.log('上次关闭时的播放器状态:', playerState);

                if (playerState) {
                    setQueue(playerState.queue || []);
                    await completeTrackInfo(playerState);
                    setIndexList(playerState.indexList || []);
                    setCurrentIndex(playerState.currentIndex || 0);
                    const initialTrack = playerState.queue[playerState.indexList[playerState.currentIndex]];
                    setAudioSrc(await getAudioSrc(initialTrack));
                    setCurrentTrackInfo(initialTrack); // 设置当前曲目信息
                    setIsPlaying(playerState.isPlaying || false);
                    setCurrentTime(playerState.currentTime || 0);
                    setPlaybackMode(playerState.playbackMode || 'loop');
                    console.log('当前播放模式:', playbackModeRef.current);
                }
            } catch (error) {
                console.error('Failed to load player state:', error);
            }
        };

        loadPlayer();
    }, []); // 只在组件挂载时执行一次

    // 监听元数据加载事件, 获取音频时长
    useEffect(() => {
        const handleLoadedMetadata = () => {
            if (audioRef.current) {
                const track = queueRef.current[indexListRef.current[currentIndexRef.current]];
                if (track && track.duration === undefined) {
                    track.duration = audioRef.current.duration;
                }
            }
        };

        const audioElement = audioRef.current;
        if (audioElement) {
            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        return () => {
            if (audioElement) {
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            }
        };
    }, [audioRef, audioSrcRef, currentIndexRef, queueRef, indexListRef]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.src = audioSrcRef.current;
        }
    }, [audioSrcRef]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (audioRef.current && isPlayingRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isPlayingRef]);

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
    }, [audioSrcRef]);

    window.queue = queueRef.current
    window.indexList = indexListRef.current
    window.currentIndex = currentIndexRef.current
    return {
        queueRef,
        currentIndexRef,
        audioSrcRef,
        isPlayingRef,
        currentTimeRef,
        playbackModeRef,
        currentTrackInfoRef,
        nextTracksRef,
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        cyclePlaybackMode,
        addToNext,
        addToNextAndPlay,
        replacePlayQueue,
        seekTo,
        changeVolume,
        setAudioSrc,
        setIsPlaying,
        setCurrentTime,
    };
}

export default usePlayer;
