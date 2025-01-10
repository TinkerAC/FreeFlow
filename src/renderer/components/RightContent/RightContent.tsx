import React from 'react';
import './RightContent.css';
import PlayQueue from '../PlayQueue/PlayQueue';
import { PlayerState, TrackModel } from '@src/shared/types';

interface RightContentProps {
  className?: string;
  clearQueue: () => void;
  playerState: PlayerState;
  addToNextAndPlay: (track: TrackModel) => void;
}


export default function RightContent({
                                       clearQueue,
                                       playerState = PlayerState.empty(),
                                       addToNextAndPlay,
                                     }: RightContentProps) {

  // 从播放器状态中提取所需信息
  const { currentTrackInfo, nextTracks } = playerState;
  // console.log(currentTrackInfo, nextTracks);


  if (!currentTrackInfo && nextTracks.length === 0) {
    return <div className="right-content">
      <div className="empty-play-queue">
        <i className="fas fa-music text-4xl text-gray-400"></i>
        <p className="text-gray-400 whitespace-nowrap">暂无播放队列</p>
      </div>
    </div>;
  }


  return <div className="right-content">
    <PlayQueue
      currentTrack={currentTrackInfo}
      nextTracks={nextTracks}
      clearQueue={clearQueue}
      addToNextAndPlay={addToNextAndPlay}

    />

  </div>;

}



