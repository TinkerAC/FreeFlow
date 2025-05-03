// ------------------------------
// File: src/renderer/components/SearchResultView/tabs/TracksTab.tsx
// ------------------------------
import React from 'react';
import Player from '@renderer/core/player/Player';
import { Hifini, NetEaseCloudMusic, QQMusic } from '@components/static';
import { TrackModel } from '@src/shared/domainModel/TrackModel';

interface TracksTabProps {
  tracks: TrackModel[];
  player: Player;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement, MouseEvent>, track: TrackModel) => void;
}

function PlatformIcon({ platform }: { platform: string }) {
  return (
    <>
      {platform === 'NetEaseCloudMusic' && (
        <img src={NetEaseCloudMusic} alt={platform} style={{ width: 20, height: 20, objectFit: 'contain' }} />
      )}
      {platform === 'Hifini' && (
        <img src={Hifini} alt={platform} style={{ width: 20, height: 20, objectFit: 'contain' }} />
      )}
      {platform === 'QQMusic' && (
        <img src={QQMusic} alt={platform} style={{ width: 20, height: 20, objectFit: 'contain' }} />
      )}
    </>
  );
}

function TracksTab({ tracks, player, onContextMenu }: TracksTabProps) {
  if (tracks.length === 0) {
    return <div className="text-gray-500">没有找到歌曲。</div>;
  }

  return (
    <div className="space-y-2">
      {tracks.map((track, index) => (
        <div
          key={`${track.platform}_${track.platform_unique_id}_${index}`}
          className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover cursor-pointer"
          onDoubleClick={() => player.addTrackToNextAndPlay(track)}
          onContextMenu={(e) => onContextMenu(e, track)}
        >
          <img src={track.cover_src} alt={track.title} className="w-12 h-12 rounded" />
          <div className="flex-grow overflow-x-auto whitespace-nowrap no-scrollbar">
            <div>{track.title}</div>
            <div className="text-gray-400">{track.artist}</div>
          </div>
          <div className="text-sm text-gray-500">{track.duration.toFixed(1)}</div>
          <div className="flex-shrink-0">
            <PlatformIcon platform={track.platform} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default TracksTab;

