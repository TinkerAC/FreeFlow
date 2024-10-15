import React from 'react';
import './PlayerBar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import {formatTime} from "../../utils/timeUtils.js";

export default function Playerbar({
                                      isPlaying = false,
                                      currentTime = 0,
                                      setCurrentTime = (time) => {
                                      },
                                      trackInfo = {},
                                      playbackMode = 'loop',
                                      onPlayNext = () => {
                                      },
                                      onPlayPrevious = () => {
                                      },
                                      onTogglePlayPause = () => {
                                      },
                                      onCyclePlaybackMode = () => {
                                      },
                                      onSeekTo = (newTime) => {
                                      },
                                      onVolumeChange = (volume) => {
                                      },
                                      onToggleRightContent = () => {
                                      },
                                        volumeRef = {current: 0.5}
                                  }) {
    const handleSeekTo = (event) => {
        const newTime = parseFloat(event.target.value);
        if (!isNaN(newTime) && newTime >= 0 && newTime <= (trackInfo.duration || 0)) {
            setCurrentTime(newTime);
            onSeekTo(newTime);
        }
    };

    const handleVolumeChange = (event) => {
        const volume = parseFloat(event.target.value);
        if (!isNaN(volume) && volume >= 0 && volume <= 1) {
            onVolumeChange(volume);
        }
    };

    return (
        <div className="player-bar max-h-32 overflow-y-hidden">
            <div className="left-section w-1/4">
                <img src={trackInfo.cover_src || ""} alt="album cover" className="album-cover"/>
                <div className="playerState-info overflow-x-hidden">
                    <div className="playerState-title text-sm text-nowrap">{trackInfo.title || '未知标题'}</div>
                    <div
                        className="playerState-artist text-sm text-gray-400 text-nowrap">{trackInfo.artist || '未知艺术家'}</div>
                </div>
            </div>

            <div className="middle-section">
                <div>
                    <div className="playback-controls">
                        <i
                            className={`fas 
                            ${playbackMode === 'loop' ? 'fa-redo' :
                                playbackMode === 'shuffle' ? 'fa-random' : 'fa-sync'}`}
                            onClick={onCyclePlaybackMode}
                        />
                        <i className="fas fa-step-backward" onClick={onPlayPrevious}/>
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`} onClick={onTogglePlayPause}/>
                        <i className="fas fa-step-forward" onClick={onPlayNext}/>
                    </div>

                    <div className="progress-bar">
                        <span className="current-time">{formatTime(currentTime)}</span>
                        <input
                            type="range"
                            className="progress-slider"
                            min="0"
                            max={trackInfo.duration || 0}
                            value={currentTime}
                            step="1"
                            onChange={handleSeekTo}
                        />
                        <span className="total-time">{formatTime(trackInfo.duration || 0)}</span>
                    </div>
                </div>
            </div>

            <div className="right-section">
                <i className="fas fa-list"
                   onClick={onToggleRightContent}
                   title={"播放列表"}/>
                <i className="fas fa-search"></i>
                <i className="fas fa-bars"></i>
                <i className="fas fa-expand"></i>
                <input
                    value={volumeRef.current}
                    type="range"
                    className="volume-slider"
                    onChange={handleVolumeChange}
                    min="0"
                    max="1"
                    step="0.01"

                />
                <i className="fas fa-expand-arrows-alt"></i>
            </div>
        </div>
    );
}
