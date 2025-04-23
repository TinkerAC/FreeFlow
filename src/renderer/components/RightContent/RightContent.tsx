// file: src/renderer/components/RightContent/RightContent.tsx
import React from 'react';
import PlayQueue from '../PlayQueue/PlayQueue';
import ContentPanel from '@components/ContentPanel/ContentPenal';
import Player from '@components/Player';

interface RightContentProps {
  className?: string;
  player: Player;
}

export default function RightContent({
                                       player,
                                     }: RightContentProps) {

  if (!player) {
    return null;
  }


  if (player.currentTrackInfo && player.nextTracks.length === 0) {
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
        currentTrack={player.currentTrackInfo}
        nextTracks={player.nextTracks}
        clearQueue={() => player.clearQueue()}
        addToNextAndPlay={(track) => player.addTrackToNextAndPlay(track)}
      />
    </ContentPanel>
  );
}