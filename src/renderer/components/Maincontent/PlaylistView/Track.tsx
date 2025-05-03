import React, { useState } from 'react';
import { formatTime, timeAgo } from '@src/utils/timeUtils';
import { DefaultCover } from '@components/static';
import Player from '@renderer/core/player/Player';
import { TrackModel } from '@src/shared/domainModel/TrackModel';

interface TrackProps {
  track: TrackModel;
  index: number;
  onRightClick: (e: React.MouseEvent<HTMLTableRowElement>, track: TrackModel) => void;
  player: Player;
}


const Track: React.FC<TrackProps>
  = ({
       track,
       index,
       onRightClick,
       player,
     }: TrackProps) => {
  const [hovered, setHovered] = useState(false);

  const handlePlayClick = (e: { stopPropagation: () => void; }) => {
    e.stopPropagation();
    player.addTrackToNextAndPlay(track);
  };

  return (
    <tr
      className={`${
        index === 0 ? 'border-t border-gray-700' : ''
      } hover:bg-[#2A2A2A]`}
      onContextMenu={(e) => onRightClick(e, track)}
      onDoubleClick={() => player.addTrackToNextAndPlay(track)}

    >
      <td
        className="py-2 cursor-pointer text-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/*实现悬浮后显示播放按钮,点击播放按钮播放*/}
        {hovered ? (
          <i
            className="fas fa-play cursor-pointer"
            onClick={handlePlayClick}
            aria-label="播放"
          ></i>
        ) : (
          index + 1
        )}
      </td>

      <td className="py-2 flex items-center overflow-hidden">
        <img
          src={track?.cover_src || DefaultCover}
          alt="Album cover"
          className="w-10 h-10 mr-4 object-cover rounded flex-shrink-0"
          loading="lazy"
        />
        <div className="overflow-hidden">
          <div className="font-semibold hover:underline overflow-hidden text-ellipsis whitespace-nowrap">
            {track?.title || '未知标题'}
          </div>
          <div className="text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
            {track?.artist || '未知艺术家'}
          </div>
        </div>
      </td>

      {/* 专辑列 */}
      <td className="py-2 overflow-hidden text-ellipsis whitespace-nowrap hidden md:table-cell">
        {track?.album || '未知专辑'}
      </td>

      {/* 添加日期列 */}
      <td className="py-2 overflow-hidden text-ellipsis whitespace-nowrap hidden lg:table-cell">
        {track?.created_at ? timeAgo(track.created_at) : '未知时间'}
      </td>

      <td className="py-2 whitespace-nowrap text-right">
        {track?.duration ? formatTime(track.duration) : '未知时长'}
      </td>
    </tr>
  );
};


export default Track;
