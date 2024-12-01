import React from 'react';
import './RightContent.css';
import PlayQueue from '../PlayQueue/PlayQueue';

interface RightContentProps {
  className?: string;
  clearQueue: () => void;
  playerState: any;
}


export default function RightContent({
                                       clearQueue,
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
                                       },
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
    />

  </div>;

}



