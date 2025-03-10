// file: src/renderer/components/RightContent/RightContent.tsx
import React from 'react';
import PlayQueue from '../PlayQueue/PlayQueue';
import { PlayerState, TrackModel } from '@src/shared/types';
import ContentPanel from '@components/ContentPanel/ContentPenal';

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
  const { currentTrackInfo, nextTracks } = playerState;

  if (!currentTrackInfo && nextTracks.length === 0) {
    return (
      <ContentPanel className="h-full">
        <div className="empty-play-queue flex flex-col items-center justify-center h-full">
          <i className="fas fa-music text-4xl text-gray-400"></i>
          <p className="text-gray-400 whitespace-nowrap">暂无播放队列</p>
        </div>
      </ContentPanel>
    );
  }

  return (
    <ContentPanel className="h-full">
      <PlayQueue
        currentTrack={currentTrackInfo}
        nextTracks={nextTracks}
        clearQueue={clearQueue}
        addToNextAndPlay={addToNextAndPlay}
      />
    </ContentPanel>
  );
}