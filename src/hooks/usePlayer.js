import {useState, useEffect} from 'react';

async function fetchTrackInfo(file_path) {
    return await window.playerAPI.getTrackInfo(file_path);
}

function usePlayer(audioRef) {
    // 队列管理部分
    const [queue, setQueue] = useState([]); // 播放队列
    const [indexList, setIndexList] = useState([]); // 索引列表
    const [currentIndex, setCurrentIndex] = useState(0); // 当前播放索引
    // 播放控制部分
    const [audioSrc, setAudioSrc] = useState(''); // 当前播放音频文件路径
    const [isPlaying, setIsPlaying] = useState(false); // 播放状态，是否正在播放
    const [currentTime, setCurrentTime] = useState(0); // 当前播放时间进度
    const [playbackMode, setPlaybackMode] = useState('loop'); // 播放模式
    const [currentTrackInfo, setCurrentTrackInfo] = useState({}); // 当前播放曲目信息
    const [nextTracks, setNextTracks] = useState([]); // 下一首曲目列表


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
                    setAudioSrc(initialTrack.file_path || initialTrack.audioSrc|| "");
                    setCurrentTrackInfo(initialTrack); // 设置当前曲目信息
                    setNextTracks(calculateNextTracks(playerState.queue, playerState.indexList, playerState.currentIndex)); // 设置下一首曲目列表
                    setIsPlaying(playerState.isPlaying || false);
                    setCurrentTime(playerState.currentTime || 0);
                    setPlaybackMode(playerState.playbackMode || 'loop');
                    console.log('当前播放模式:', playbackMode);
                }
            } catch (error) {
                console.error('Failed to load player state:', error);
            }
        };

        loadPlayer();
    }, []); // 只在组件挂载时执行一次


    // 监听 audioSrc 的变化，更新 audio 元素的 src
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.src = audioSrc;
        }
    }, [audioSrc]);

    // 每秒更新 currentTime
    useEffect(() => {
        const updateCurrentTime = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const interval = setInterval(updateCurrentTime, 1000);
        return () => clearInterval(interval);
    }, [isPlaying]);


    //监听播放结束事件
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
    }, [audioSrc]);//不知为什么,audioref.current不能放在依赖里面

    const play = () => {
        audioRef.current.play();
        setIsPlaying(true);
    };

    const pause = () => {
        audioRef.current.pause();
        setIsPlaying(false);
    };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (audioRef.current.paused) {
                play();
            } else {
                pause();
            }
        }
    };

    const playNext = () => {
        console.log(queue, indexList, currentIndex);
        // 如果队列为空，直接返回
        if (indexList.length === 0) return;

        // 计算并将索引设置为下一个索引
        const nextIndex = (currentIndex + 1) % indexList.length; // 循环播放

        setCurrentIndex(nextIndex);

        const nextTrack = queue[indexList[nextIndex]]; // 使用计算后的索引来获取音轨信息
        setAudioSrc(nextTrack.file_path || nextTrack.audioSrc);
        setCurrentTrackInfo(nextTrack); // 更新当前曲目信息
        setNextTracks(calculateNextTracks(queue, indexList, nextIndex)); // 更新下一首曲目列表
        setCurrentTime(0);

        audioRef.current.addEventListener('canplaythrough', play, {once: true});
    };

    const playPrevious = () => {
        // 如果队列为空，直接返回
        if (indexList.length === 0) return;

        // 计算并将索引设置为上一个索引
        const prevIndex = (currentIndex - 1 + indexList.length) % indexList.length; // 循环播放
        setCurrentIndex(prevIndex);

        const prevTrack = queue[indexList[prevIndex]]; // 使用计算后的索引来获取音轨信息
        setAudioSrc(prevTrack.file_path || prevTrack.audioSrc);
        setCurrentTrackInfo(prevTrack); // 更新当前曲目信息
        setNextTracks(calculateNextTracks(queue, indexList, prevIndex)); // 更新下一首曲目列表
        setCurrentTime(0);

        audioRef.current.addEventListener('canplaythrough', play, {once: true});
    };

    // 计算下一首曲目列表
    const calculateNextTracks = (queue, indexList, currentIndex) => {
        if (queue.length === 0) return [];
        if (currentIndex === queue.length - 1) {
            return indexList.map(index => queue[index]); // 如果是最后一个，则返回按照 indexList 排序的完整队列
        } else {
            return indexList.slice(currentIndex + 1).map(index => queue[index]); // 否则返回剩余的曲目
        }
    };

    // 轮询播放模式
    const cyclePlaybackMode = () => {
        const MODES = ['loop', 'repeat', 'shuffle'];
        const nextMode = MODES[(MODES.indexOf(playbackMode) + 1) % MODES.length];

        // 记录当前播放的歌曲索引
        const playingIndex = indexList[currentIndex];

        let newIndexList;
        let newCurrentIndex;

        switch (nextMode) {
            case 'loop': {
                newIndexList = Array.from({length: queue.length}, (_, i) => i);
                newCurrentIndex = newIndexList.indexOf(playingIndex);
                break;
            }
            case 'shuffle': {
                newIndexList = Array.from({length: queue.length}, (_, i) => i).sort(() => Math.random() - 0.5);
                newCurrentIndex = newIndexList.indexOf(playingIndex);
                break;
            }
            case 'repeat': {
                newIndexList = [playingIndex];
                newCurrentIndex = 0;
                break;
            }
            default:
                console.error('Unknown mode:', nextMode);
                return; // 提前返回，因为没有必要继续执行
        }

        // 更新索引列表和当前索引
        setIndexList(newIndexList);
        setCurrentIndex(newCurrentIndex);

        // 更新播放模式
        setPlaybackMode(nextMode);

        // 更新下一首曲目列表
        setNextTracks(calculateNextTracks(queue, newIndexList, newCurrentIndex));

        // 打印新的播放模式和状态
        console.log('播放模式切换为:', nextMode);
        console.log('当前队列:', queue);
        console.log('新的索引列表:', newIndexList);
        console.log('新的当前索引:', newCurrentIndex);
    };

    const addTracksToPlayQueue = (tracks) => {
        if (tracks.length === 0) return;

        const updatedQueue = [...queue, ...tracks];
        setQueue(updatedQueue);
        setIndexList(Array.from({length: updatedQueue.length}, (_, i) => i));
        setNextTracks(calculateNextTracks(updatedQueue, indexList, currentIndex)); // 更新下一首曲目列表
    };

    const replacePlayQueue = (tracks) => {
        setQueue(tracks);
        setIndexList(Array.from({length: tracks.length}, (_, i) => i));
        setCurrentIndex(0);
        if (tracks.length > 0) {
            setAudioSrc(tracks[0].file_path || tracks[0].audioSrc);
            setCurrentTrackInfo(tracks[0]); // 设置新的当前曲目信息
        }
        setNextTracks(calculateNextTracks(tracks, indexList, 0)); // 更新下一首曲目列表
    };

    const playNewTrack = (track) => {
        // 检查曲目是否存在于队列中
        if (!isExistedInQueue(track)) {
            console.log('新曲目:', track);

            // 更新队列和索引列表
            const newIndex = queue.length;
            const updatedQueue = [...queue, track];
            const updatedIndexList = [...indexList];


            // 在当前曲目之后插入新曲目的索引
            updatedIndexList.splice(currentIndex + 1, 0, newIndex);

            // 设置新的队列和索引列表
            setQueue(updatedQueue);
            setIndexList(updatedIndexList);
            setCurrentIndex(currentIndex + 1);

            // 播放新添加的曲目
            setAudioSrc(track.file_path || track.audioSrc);
            setCurrentTrackInfo(track); // 更新当前曲目信息
            setNextTracks(calculateNextTracks(updatedQueue, updatedIndexList, currentIndex + 1)); // 更新下一首曲目列表
            audioRef.current.addEventListener('canplaythrough', play, {once: true});

        } else {
            console.log('已存在曲目:', track);

            const existingIndex = queue.findIndex(item => item.file_path === track.file_path);

            // 如果当前正在播放同一曲目，则不重复播放
            if (existingIndex === currentIndex) {
                console.log('曲目已在播放中:', track);
                return;
            }

            // 播放已存在的曲目
            setCurrentIndex(existingIndex);
            setAudioSrc(track.file_path || track.audioSrc);
            setCurrentTrackInfo(queue[existingIndex]); // 更新当前曲目信息
            setNextTracks(calculateNextTracks(queue, indexList, existingIndex)); // 更新下一首曲目列表
            audioRef.current.addEventListener('canplaythrough', play, {once: true});
        }
    };

    const isExistedInQueue = (track) => {
        return queue.some(item => item.file_path === track.file_path || item.audioSrc === track.audioSrc);
    };

    // 跳转到指定时间
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

    window.queue = queue;
    window.indexList = indexList;
    window.currentIndex = currentIndex;

    return {
        queue,
        currentIndex,
        audioSrc,
        isPlaying,
        currentTime,
        playbackMode,
        currentTrackInfo, // 导出当前曲目信息
        nextTracks, // 导出后续曲目列表
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        cyclePlaybackMode,
        setCurrentTime,
        setIsPlaying,
        addTracksToPlayQueue,
        replacePlayQueue,
        playNewTrack,
        seekTo,
        changeVolume,
    };
}

export default usePlayer;
