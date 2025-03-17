// file: src/renderer/components/Playerbar/PlayerBar.tsx
import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { formatTime } from '@src/utils/timeUtils';
import { PlayerState } from '@src/shared/types';
import { DefaultCover } from '@components/static';

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
  setMainContentView: (view: string) => void;
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
                                    playerState,
                                    setMainContentView,
                                  }: PlayerBarProps) {
  const { playbackMode, isPlaying, currentTime, currentTrackInfo, volume } = playerState;

  const handleSeekTo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(event.target.value);
    if (!isNaN(newTime) && newTime >= 0 && newTime <= (currentTrackInfo?.duration || 0)) {
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(event.target.value);
    if (!isNaN(vol) && vol >= 0 && vol <= 1) {
      onVolumeChange?.(vol);
    }
  };

  return (
    <div className="w-full flex items-center justify-between p-4 bg-black text-white">
      {/* 左侧：封面 + 曲目信息 */}
      <div className="flex items-center w-1/4">
        {/* 专辑封面 */}
        <img
          src={currentTrackInfo?.cover_src || DefaultCover}
          alt="album cover"
          className="w-12 h-12 rounded-md"
        />
        {/* 歌曲信息 */}
        <div className="ml-4 overflow-x-hidden">
          <div className="text-sm font-semibold whitespace-nowrap">
            {currentTrackInfo?.title || '未知标题'}
          </div>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {currentTrackInfo?.artist || '未知艺术家'}
          </div>
        </div>

        {/*如果正在加载,显示加载动画*/}
        {playerState.isLoading && (
          <div className="ml-4">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        )}

      </div>

      {/* 中间：播放控制 + 进度条 */}
      <div className="flex items-center justify-center flex-grow">
        <div>
          {/* 播放控制按钮组 */}
          <div className="flex items-center justify-center">
            <i
              className={`fas ${
                playbackMode === 'loop'
                  ? 'fa-redo'
                  : playbackMode === 'shuffle'
                    ? 'fa-random'
                    : 'fa-sync'
              } mx-3 cursor-pointer`}
              onClick={onCyclePlaybackMode}
            />
            <i className="fas fa-step-backward mx-3 cursor-pointer" onClick={onPlayPrevious} />
            <i
              className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mx-3 cursor-pointer`}
              onClick={onTogglePlayPause}
            />
            <i className="fas fa-step-forward mx-3 cursor-pointer" onClick={onPlayNext} />
          </div>

          {/* 进度条 */}
          <div className="flex items-center ml-4 flex-grow">
            <span className="text-sm mx-2">{formatTime(currentTime)}</span>
            <input
              type="range"
              className="mx-2 flex-grow cursor-pointer"
              min="0"
              max={currentTrackInfo?.duration || 0}
              value={currentTime}
              step="1"
              onChange={handleSeekTo}
            />
            <span className="text-sm mx-2">
              {formatTime(currentTrackInfo?.duration || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 右侧：播放列表、音量等功能 */}
      <div className="flex items-center">
        <i
          className="fas fa-list mx-3 cursor-pointer"
          onClick={onToggleRightContent}
          title="播放列表"
        />
        <i className="fas fa-search mx-3 cursor-pointer" />
        <i className="fas fa-filter mx-3 cursor-pointer" title="播放所有歌曲" />
        {/*切换歌词界面*/}
        <i className="fas fa-align-center mx-3 cursor-pointer"
           onClick={
             () => {
               setMainContentView('lyric');
             }
           }
        />
        <input
          value={volume}
          type="range"
          className="mx-2 w-24 cursor-pointer"
          onChange={handleVolumeChange}
          min="0"
          max="1"
          step="0.01"
        />

        {/*全屏/退出全屏*/}
        {document.fullscreenElement ? (
          <i
            className="fas fa-compress mx-3 cursor-pointer"
            onClick={() => {
              document.exitFullscreen().then(r => console.log(r));
            }}
          />
        ) : (
          <i
            className="fas fa-expand mx-3 cursor-pointer"
            onClick={() => {
              document.documentElement.requestFullscreen().then(r => console.log(r));
            }}
          />)}

      </div>
    </div>
  );
}