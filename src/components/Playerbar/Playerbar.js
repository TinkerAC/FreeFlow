import React, { useEffect, useRef } from 'react';
import './PlayerBar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { formatTime } from "../../utils/timeUtils.js";

const PlayerBar = ({
    audioRef,
    audioSrc,
    isPlaying,
    currentTime,
    setCurrentTime,
    metaInfo,
    playbackMode,
    onPlayNext,
    onPlayPrevious,
    onTogglePlayPause,
    onCyclePlaybackMode,
}) => {
    const intervalRef = useRef(null);

    useEffect(() => {
        const updateCurrentTime = () => {
            if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        if (isPlaying) {
            intervalRef.current = setInterval(updateCurrentTime, 1000);
        } else if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPlaying, setCurrentTime, audioRef]);

    const handleSeekTo = (e) => {
        const newTime = Number(e.target.value);
        setCurrentTime(newTime);
        audioRef.current.currentTime = newTime;
    };

    return (
        <div className="player-bar max-h-32">
            <audio ref={audioRef} src={`file://${audioSrc}`} onEnded={onPlayNext} />

            <div className="left-section max-w-1/4">
                <img src={metaInfo.common.base64Cover} alt="album cover" className="album-cover" />
                <div className="playerState-info">
                    <div className="playerState-title text-sm">{metaInfo.common.title}</div>
                    <div className="playerState-artist text-sm text-gray-400">{metaInfo.common.artist}</div>
                </div>
            </div>

            <div className="middle-section">
                <div>
                    <div className="playback-controls">
                        <i className="fas fa-random" onClick={onCyclePlaybackMode} />
                        <i className="fas fa-step-backward" onClick={onPlayPrevious} />
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} onClick={onTogglePlayPause} />
                        <i className="fas fa-step-forward" onClick={onPlayNext} />
                    </div>

                    <div className="progress-bar">
                        <span className="current-time">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            className="progress-slider"
                            min="0"
                            max={metaInfo.format.duration}
                            value={currentTime}
                            step="1"
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
                    onMouseUp={(e) => audioRef.current.volume = e.target.value}
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
