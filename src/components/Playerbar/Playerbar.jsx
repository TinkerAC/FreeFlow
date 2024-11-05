import React from 'react';
import './PlayerBar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import {formatTime} from "../../utils/timeUtils.js";

export default function Playerbar({
                                      setCurrentTime = (time) => {
                                      },
                                      onPlayNext = () => {
                                      },
                                      onPlayPrevious = () => {
                                      },
                                      onTogglePlayPause = () => {
                                      },
                                      onCyclePlaybackMode = () => {
                                      },
                                      onVolumeChange = (volume) => {
                                      },
                                      onToggleRightContent = () => {
                                      },
                                      playerState = {
                                          queue: [],
                                          indexList: [],
                                          currentIndex: 0,
                                          playbackMode: 'loop',
                                          audioSrc: '',
                                          isPlaying: false,
                                          currentTime: 0,
                                          currentTrackInfo: {},
                                          nextTracks: [],
                                          volume: 0.5,
                                      }// 使用默认值避免解构时出现 undefined
                                  }) {
    // 从播放器状态中提取所需信息

    const { playbackMode, isPlaying, currentTime,currentTrackInfo, volume} = playerState;


    const handleSeekTo = (event) => {
        const newTime = parseFloat(event.target.value);
        if (!isNaN(newTime) && newTime >= 0 && newTime <= (currentTrackInfo.duration || 0)) {
            setCurrentTime(newTime);
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
                <img src={currentTrackInfo.cover_src || ""} alt="album cover" className="album-cover"/>
                <div className="playerState-info overflow-x-hidden">
                    <div className="playerState-title text-sm text-nowrap">{currentTrackInfo.title || '未知标题'}</div>
                    <div
                        className="playerState-artist text-sm text-gray-400 text-nowrap">{currentTrackInfo.artist || '未知艺术家'}</div>
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
                            max={currentTrackInfo.duration || 0}
                            value={currentTime}
                            step="1"
                            onChange={handleSeekTo}
                        />
                        <span className="total-time">{formatTime(currentTrackInfo.duration || 0)}</span>
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
                    value={volume}
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
