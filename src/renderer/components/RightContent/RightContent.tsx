// file: src/renderer/components/RightContent/RightContent.tsx
import React from 'react';
import PlayQueue from '@components/RightContent/PlayQueue/PlayQueue';
import PlayerController from '@renderer/core/controller/PlayerController';

export interface RightContentProps {
  className?: string;
  player: PlayerController;
}


export default function RightContent({
                                       player,
                                     }: RightContentProps) {


  if (!player) {
    return null;
  }

  const currentTrack = player.playQueue.currentTrack;
  const remainingTracks = player.playQueue.remainingTracks;


  if (!currentTrack && !remainingTracks.length) {
    return (
      <div className="empty-play-queue flex flex-col items-center justify-center h-full">
        <i className="fas fa-music text-4xl text-gray-400"></i>
        <p className="text-gray-400 whitespace-nowrap">暂无播放队列</p>
      </div>
    );
  }

  return (
    <PlayQueue
      currentTrack={currentTrack}
      nextTracks={remainingTracks}
      clearQueue={() => player.clearQueue()}
      addToNextAndPlay={(track) => player.addTrackToNextAndPlay(track)}
    />

  );
}