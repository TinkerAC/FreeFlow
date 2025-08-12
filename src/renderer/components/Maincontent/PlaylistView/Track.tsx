import React, { useState } from 'react';
import { formatTime, timeAgo } from '@src/utils/timeUtils';
import { DefaultCover } from '@components/static';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import styles from './PlaylistView.module.css'; // 复用同一模块中的行/列样式

interface TrackProps {
  track: TrackEntity;
  index: number;
  onRightClick: (e: React.MouseEvent<HTMLTableRowElement>, track: TrackEntity) => void;
  player: PlayerController;
}

const Track: React.FC<TrackProps> = ({ track, index, onRightClick, player }) => {
  const [hovered, setHovered] = useState(false);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    player.addTrackToNextAndPlay(track);
  };

  return (
    <tr
      id={`track-${track.id}`}
      className={styles.row}
      onContextMenu={(e) => onRightClick(e, track)}
      onDoubleClick={() => player.addTrackToNextAndPlay(track)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 序号 / 播放 */}
      <td className={styles.colIndex}>
        {hovered ? (
          <i className="fas fa-play cursor-pointer" onClick={handlePlayClick} aria-label="播放" />
        ) : (
          index + 1
        )}
      </td>

      {/* 标题 + 艺术家（缩略图+两行文本） */}
      <td className={styles.colTitle}>
        <div className={styles.titleWrap}>
          <img src={track?.cover_src || DefaultCover} alt="Album cover" className={styles.thumb} loading="lazy" />
          <div style={{ minWidth: 0 }}>
            <div className={styles.ttl} title={track?.title || '未知标题'}>
              {track?.title || '未知标题'}
            </div>
            <div className={styles.art} title={track?.artist || '未知艺术家'}>
              {track?.artist || '未知艺术家'}
            </div>
          </div>
        </div>
      </td>

      {/* 专辑 */}
      <td className={`${styles.colAlbum} hidden md:table-cell`} title={track?.album || '未知专辑'}>
        {track?.album || '未知专辑'}
      </td>

      {/* 添加日期 */}
      <td className={`${styles.colDate} hidden lg:table-cell`}>
        {track?.created_at ? timeAgo(track.created_at) : '未知时间'}
      </td>

      {/* 时长 */}
      <td className={styles.colDur}>
        {track?.duration ? formatTime(track.duration) : '未知时长'}
      </td>
    </tr>
  );
};

export default Track;
