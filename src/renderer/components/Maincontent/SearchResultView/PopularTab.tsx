// ------------------------------
// File: src/renderer/components/SearchResultView/tabs/PopularTab.tsx
// ------------------------------
import React from 'react';
import { TrackModel } from '@src/shared/types';
import Player from '@components/Player';

interface PopularTabProps {
  track?: TrackModel;
  player: Player;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, track: TrackModel) => void;
}

function PopularTab({ track, player, onContextMenu }: PopularTabProps) {
  if (!track) {
    return <div className="text-gray-500">没有找到热门结果。</div>;
  }

  return (
    <div
      className="flex items-center cursor-pointer hover:bg-item-bg-hover p-2 rounded-lg"
      onDoubleClick={() => player.addTrackToNextAndPlay(track)}
      onContextMenu={(e) => onContextMenu(e, track)}
    >
      <img src={track.cover_src} alt={track.title} className="w-24 h-24 rounded-lg mr-4" />
      <div className="flex flex-col overflow-x-auto whitespace-nowrap no-scrollbar">
        <div className="text-3xl mb-2">{track.title}</div>
        <div className="text-lg text-gray-400">歌曲 · {track.artist}</div>
      </div>
    </div>
  );
}

export default PopularTab;
