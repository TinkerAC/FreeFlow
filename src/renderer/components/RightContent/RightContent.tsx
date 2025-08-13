import React from 'react';
import PlayQueue from '@components/RightContent/PlayQueue/PlayQueue';
import PlayerController from '@renderer/core/controller/PlayerController';

export interface RightContentProps {
  className?: string;
  player: PlayerController | null;
}

export default function RightContent({ player }: RightContentProps) {
  if (!player) return null;

  const currentTrack = player.playQueue.currentTrack ?? null;
  const remainingTracks = player.playQueue.remainingTracks ?? [];

  if (!currentTrack && !remainingTracks.length) {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'rgb(var(--md-sys-color-on-surface-variant))',
          background: 'rgb(var(--md-sys-color-surface-container-low))',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <i className="fas fa-music" style={{ fontSize: 32, opacity: .6 }} />
          <p style={{ marginTop: 6 }}>暂无播放队列</p>
        </div>
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