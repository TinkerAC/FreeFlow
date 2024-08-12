import React, {useEffect, useRef, useState} from 'react';
import './PlayerBar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import {formatTime} from "../../utils/timeUtils.js";
import {Player} from "../../services/playerService.js";

const PlayerBar = () => {
    const audioRef = useRef(null);
    const playerRef = useRef(null);

    // 独立管理的状态
    const [audioSrc, setAudioSrc] = useState(''); // 音频文件路径
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [metaInfo, setMetaInfo] = useState({
        common: {
            title: '', artist: '', base64Cover: '',
        }, format: {
            duration: 0,
        },
    });
    const [isDragging, setIsDragging] = useState(false); // 追踪是否正在拖动进度条
    const [draggedTime, setDraggedTime] = useState(0); // 存储用户拖动的时间

    useEffect(() => {
        const initializePlayer = async () => {
            try {
                const initPlayerState = await window.playerAPI.getPlayerState();
                playerRef.current = new Player(audioRef);
                console.log("初始化前", playerRef.current);
                playerRef.current.fromJSON(initPlayerState);
                console.log("初始化后", playerRef.current);

                const initMetaInfo = await window.playerAPI.getMusicMetaInfo(playerRef.current.getCurrentFilePath());
                console.log("initMetaInfo", initMetaInfo);
                setMetaInfo(initMetaInfo);

                setAudioSrc(playerRef.current.getCurrentFilePath());
            } catch (error) {
                console.error("初始化播放器时出错：", error);
            }
        };

        initializePlayer();
    }, []);

    // 更新播放时间
    useEffect(() => {
        const updateCurrentTime = () => {
            if (audioRef.current && !isDragging) {
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const audio = audioRef.current;
        if (audio && !audio.paused) {
            const interval = setInterval(updateCurrentTime, 1000); // 每秒更新一次播放时间
            return () => clearInterval(interval); // 组件卸载时清除定时器
        }
    }, [isPlaying, isDragging]);

    // 更新音乐元信息
    useEffect(() => {
        updateMetaInfo();
    }, [audioSrc]);

    // 处理进度条拖动事件
    const handleSeekTo = (e) => {
        setDraggedTime(Number(e.target.value));
    };

    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        audioRef.current.currentTime = draggedTime;
        setCurrentTime(draggedTime);
    };

    const play = () => {
        audioRef.current.play();
        setIsPlaying(true);
    }

    const pause = () => {
        audioRef.current.pause();
        setIsPlaying(false);
    }

    const updateMetaInfo = async () => {
        const metaInfo = await window.playerAPI.getMusicMetaInfo(playerRef.current.getCurrentFilePath());
        console.log("updateMetaInfo", metaInfo);
        setMetaInfo(metaInfo);
    }

    const playNext = () => {
        setAudioSrc(playerRef.current.nextFilePath());
        updateMetaInfo();
        setCurrentTime(0);

        setIsPlaying(false);
        audioRef.current.addEventListener('canplaythrough', () => {
            play();
        }, {once: true});  // 仅监听一次事件
    }

    const playPrevious = () => {
        setAudioSrc(playerRef.current.previousFilePath());
        setCurrentTime(0);
        updateMetaInfo();
        setCurrentTime(0);

        setIsPlaying(false);
        audioRef.current.addEventListener('canplaythrough', () => {

            play();
        }, {once: true});  // 仅监听一次事件
    }

    const togglePlayPause = () => {
        if (audioRef.current.paused) {
            play();
        } else {
            pause();
        }
    }

    if (!playerRef.current) {
        return null; // 如果播放器未初始化，不渲染任何内容
    }

    return (
        <div className="player-bar">
            <audio ref={audioRef} src={`file://${audioSrc}`}></audio>

            <div className="left-section">
                <img src={metaInfo.common.base64Cover} alt="album cover" className="album-cover"/>
                <div className="playerState-info">
                    <div className="playerState-title">{metaInfo.common.title}</div>
                    <div className="playerState-artist">{metaInfo.common.artist}</div>
                </div>
                <i className="fas fa-check-circle icon-check"/>
            </div>

            <div className="middle-section">
                <div>
                    <div className="playback-controls">
                        <i className="fas fa-random icon-green"/>
                        <i className="fas fa-step-backward" onClick={playPrevious}/>
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} onClick={togglePlayPause}/>
                        <i className="fas fa-step-forward" onClick={playNext}/>
                        <i className="fas fa-comment-dots"/>
                    </div>

                    <div className="progress-bar">
                        <span className="current-time">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            className="progress-slider"
                            min="0"
                            max={metaInfo.format.duration}
                            value={isDragging ? draggedTime : currentTime}
                            step="1"
                            onMouseDown={handleMouseDown}
                            onMouseUp={handleMouseUp}
                            onChange={handleSeekTo}
                        />
                        <span className="total-time">{formatTime(metaInfo.format.duration)}</span>
                    </div>
                </div>
            </div>

            <div className="right-section">
                <i className="fas fa-list"></i>
                <i className="fas fa-search"></i>
                <i className="fas fa-bars"></i>
                <i className="fas fa-expand"></i>
                <input
                    type="range"
                    className="volume-slider"
                    onMouseUp={(e) => playerRef.current.setVolume(e.target.value)}
                    min="0"
                    max="1"
                    step="0.01"
                />
                <i className="fas fa-expand-arrows-alt"></i>
            </div>
        </div>
    );
};

export default PlayerBar;
