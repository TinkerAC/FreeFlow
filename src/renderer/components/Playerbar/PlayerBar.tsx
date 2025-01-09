import React from 'react';
import './PlayerBar.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { formatTime } from '@src/utils/timeUtils';
import { PlayerState } from '@src/shared/types';

interface PlayerBarProps {
  className?: string;
  setCurrentTime?: (time: number) => void;
  onPlayNext?: () => void;
  onPlayPrevious?: () => void;
  onTogglePlayPause?: () => void;
  onCyclePlaybackMode?: () => void;
  onVolumeChange?: (volume: number) => void;
  onToggleRightContent?: () => void;
  playerState: PlayerState;
}


export default function PlayerBar({
                                    setCurrentTime = () => {
                                    },
                                    onPlayNext = () => {
                                    },
                                    onPlayPrevious = () => {
                                    },
                                    onTogglePlayPause = () => {
                                    },
                                    onCyclePlaybackMode = () => {
                                    },
                                    onVolumeChange,
                                    onToggleRightContent = () => {
                                    },
                                    playerState,// 使用默认值避免解构时出现 undefined
                                  }: PlayerBarProps) {
  // 从播放器状态中提取所需信息

  const { playbackMode, isPlaying, currentTime, currentTrackInfo, volume} = playerState;


  const handleSeekTo = (event: { target: { value: string; }; }) => {
    const newTime = parseFloat(event.target.value);
    if (!isNaN(newTime) && newTime >= 0 && newTime <= (currentTrackInfo.duration || 0)) {
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (event: { target: { value: string; }; }) => {
    const volume = parseFloat(event.target.value);
    if (!isNaN(volume) && volume >= 0 && volume <= 1) {
      onVolumeChange(volume);
    }
  };

  return (
    <div className={`player-bar sticky w-full bottom-0`}>
      <div className="left-section w-1/4">
        <img src={currentTrackInfo?.cover_src || ''} alt="album cover" className="album-cover" />
        <div className="playerState-info overflow-x-hidden">
          <div className="playerState-title text-sm text-nowrap">{currentTrackInfo?.title || '未知标题'}</div>
          <div
            className="playerState-artist text-sm text-gray-400 text-nowrap">{currentTrackInfo?.artist || '未知艺术家'}</div>
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
              max={currentTrackInfo?.duration || 0}
              value={currentTime}
              step="1"
              onChange={handleSeekTo}
            />
            <span className="total-time">{formatTime(currentTrackInfo?.duration || 0)}</span>
          </div>
        </div>
      </div>

      <div className="right-section">
        <i className="fas fa-list"
           onClick={onToggleRightContent}
           title={'播放列表'} />
        <i className="fas fa-search"></i>
        {/*是否过滤付费歌曲*/}
        { <i className="fas fa-filter" title={'播放所有歌曲'} /> }
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
