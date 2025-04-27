import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { DefaultCover } from '@components/static';
import ProgressBar from '@components/ProgressBar';
import Player from '@components/Player';
import { MainContentViewStack, ViewName } from '@components/Maincontent/MainContentViewStack';

interface PlayerBarProps {
  player: Player;
  mainContentStack: MainContentViewStack;
  onToggleRightContent: () => void;
}

export default function PlayerBar({
                                    player,
                                    mainContentStack,
                                    onToggleRightContent,
                                  }: PlayerBarProps) {

  if (!player) return null;

  const track = player.playQueue.currentTrack;

  return (
    <div className="w-full flex items-center justify-between p-4 bg-black text-white">
      {/* ---------- 左侧：封面 + 曲目信息 ---------- */}
      <div className="flex items-center w-1/4">
        <img
          src={track?.cover_src || DefaultCover}
          alt="album cover"
          className="w-12 h-12 rounded-md"
        />
        <div className="ml-4 overflow-x-hidden">
          <div className="text-sm font-semibold whitespace-nowrap">
            {track?.title || '未知标题'}
          </div>
          <div className="text-sm text-gray-400 whitespace-nowrap">
            {track?.artist || '未知艺术家'}
          </div>
        </div>
        {player.isLoading && (
          <div className="ml-4">
            <i className="fas fa-spinner fa-spin" />
          </div>
        )}
      </div>

      {/* ---------- 中间：播放控制 + 进度条 ---------- */}
      <div className="flex items-center justify-center flex-grow">
        <div className="w-full mx-4">
          {/* 播放控制按钮 */}
          <div className="flex items-center justify-center mb-2">
            <i
              className={`fas ${
                player.playbackMode === 'loop'
                  ? 'fa-redo'
                  : player.playbackMode === 'shuffle'
                    ? 'fa-random'
                    : 'fa-sync'
              } mx-3 cursor-pointer`}
              onClick={() => player.cyclePlaybackMode()}
            />
            <i
              className="fas fa-step-backward mx-3 cursor-pointer"
              onClick={() => player.playPrevious()}
            />
            <i
              className={`fas ${player.isPlaying ? 'fa-pause' : 'fa-play'} mx-3 cursor-pointer`}
              onClick={() => player.togglePlayPause()}
            />
            <i
              className="fas fa-step-forward mx-3 cursor-pointer"
              onClick={() => player.playNext()}
            />
          </div>

          {/* 进度条 */}
          <ProgressBar
            value={player.currentTime}
            min={0}
            max={track?.duration || 0}
            onChange={(val) => player.setCurrentTime(val)}
          />
        </div>
      </div>

      {/* ---------- 右侧：列表 / 音量 / 其他 ---------- */}
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
          onClick={() => mainContentStack.navigate(ViewName.LYRIC)}
        />
        <input
          type="range"
          className="mx-2 w-24 cursor-pointer"
          min={0}
          max={1}
          step={0.01}
          value={player.volume}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) player.setVolume(v);
          }}
        />
        {document.fullscreenElement ? (
          <i
            className="fas fa-compress mx-3 cursor-pointer"
            onClick={() => document.exitFullscreen()}
          />
        ) : (
          <i
            className="fas fa-expand mx-3 cursor-pointer"
            onClick={() => document.documentElement.requestFullscreen()}
          />
        )}
      </div>
    </div>
  );
}
