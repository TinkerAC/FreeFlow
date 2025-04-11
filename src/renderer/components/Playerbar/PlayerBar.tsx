import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { PlayerState } from '@src/shared/types';
import { DefaultCover } from '@components/static';
import ProgressBar from '@components/ProgressBar';

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

  return (
    <div className="w-full flex items-center justify-between p-4 bg-black text-white">
      {/* 左侧：封面 + 曲目信息 */}
      <div className="flex items-center w-1/4">
        <img
          src={currentTrackInfo?.cover_src || DefaultCover}
          alt="album cover"
          className="w-12 h-12 rounded-md"
        />
        <div className="ml-4 overflow-x-hidden">
          <div className="text-sm font-semibold whitespace-nowrap">
            {currentTrackInfo?.title || '未知标题'}
          </div>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {currentTrackInfo?.artist || '未知艺术家'}
          </div>
        </div>
        {playerState.isLoading && (
          <div className="ml-4">
            <i className="fas fa-spinner fa-spin"></i>
          </div>
        )}
      </div>

      {/* 中间：播放控制 + 自定义进度条 */}
      <div className="flex items-center justify-center flex-grow">
        <div className="w-full mx-4">
          <div className="flex items-center justify-center mb-2">
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
          {/* 使用 ProgressBar 组件替换原始进度条 */}
          <ProgressBar
            value={currentTime}
            min={0}
            max={currentTrackInfo?.duration || 0}
            onChange={setCurrentTime || (() => {
            })}
          />
        </div>
      </div>

      {/* 右侧：播放列表、音量及其他功能 */}
      <div className="flex items-center">
        <i
          className="fas fa-list mx-3 cursor-pointer"
          onClick={onToggleRightContent}
          title="播放列表"
        />
        <i className="fas fa-search mx-3 cursor-pointer" />
        <i className="fas fa-filter mx-3 cursor-pointer" title="播放所有歌曲" />
        <i
          className="fas fa-align-center mx-3 cursor-pointer"
          onClick={() => {
            setMainContentView('lyric');
          }}
        />
        <input
          value={volume}
          type="range"
          className="mx-2 w-24 cursor-pointer"
          onChange={(e) => {
            const vol = parseFloat(e.target.value);
            if (!isNaN(vol) && vol >= 0 && vol <= 1) {
              onVolumeChange?.(vol);
            }
          }}
          min="0"
          max="1"
          step="0.01"
        />
        {document.fullscreenElement ? (
          <i
            className="fas fa-compress mx-3 cursor-pointer"
            onClick={() => {
              document.exitFullscreen().then((r) => console.log(r));
            }}
          />
        ) : (
          <i
            className="fas fa-expand mx-3 cursor-pointer"
            onClick={() => {
              document.documentElement.requestFullscreen().then((r) => console.log(r));
            }}
          />
        )}
      </div>
    </div>
  );
}