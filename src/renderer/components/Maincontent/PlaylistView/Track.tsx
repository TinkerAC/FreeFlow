// file: src/renderer/components/Maincontent/PlaylistView/Track.tsx
import React, { useLayoutEffect, useRef, useState } from 'react';
import { formatTime, timeAgo } from '@src/utils/timeUtils';
import { Bilibili, DefaultCover, Hifini, NetEaseCloudMusic, QQMusic, YouTubeMusic } from '@components/static';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import styles from './PlaylistView.module.css';

interface TrackProps {
  track: TrackEntity;
  index: number;
  onRightClick: (e: React.MouseEvent<HTMLTableRowElement>, track: TrackEntity) => void;
  player: PlayerController;
}

/** 只有在文本溢出时才启用“往返跑马灯” */
function TtlMarquee({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [needMarquee, setNeedMarquee] = useState(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const check = () => setNeedMarquee(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);

  return (
    <div className={styles.ttlBox} ref={boxRef} title={text}>
      <div className={needMarquee ? styles.ttlMarquee : styles.ttlStatic}
           style={needMarquee ? ({ ['--ttl-shift' as any]: '-45%' }) : undefined}>
        {text}
      </div>
    </div>
  );
}

const Track: React.FC<TrackProps> = ({ track, index, onRightClick, player }) => {
  const [hovered, setHovered] = useState(false);
  const [isCurrentTrack, setIsCurrentTrack] = useState(false);

  // 检测是否为当前播放曲目
  React.useEffect(() => {
    const checkCurrentTrack = () => {
      setIsCurrentTrack(player.playQueue.currentTrack?.id === track.id);
    };
    
    checkCurrentTrack();
    // 监听播放状态变化
    const interval = setInterval(checkCurrentTrack, 500);
    return () => clearInterval(interval);
  }, [player, track.id]);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    player.addTrackToNextAndPlay(track);
  };

  return (
    <tr
      id={`track-${track.id}`}
      className={`${styles.row} ${isCurrentTrack ? styles.playing : ''}`}
      onContextMenu={(e) => onRightClick(e, track)}
      onDoubleClick={() => player.addTrackToNextAndPlay(track)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 序号 / 播放（更窄 + 等宽数字） */}
      <td className={styles.colIndex}>
        {hovered ? (
          <i 
            className={`fas fa-play cursor-pointer ${styles.playIcon}`} 
            onClick={handlePlayClick} 
            aria-label="播放" 
          />
        ) : isCurrentTrack ? (
          <i className="fas fa-volume-up" style={{ color: 'rgb(var(--md-sys-color-primary))' }} />
        ) : (
          index + 1
        )}
      </td>

      {/* 标题（跑马灯按需） + 艺术家（略大、更清晰） */}
      <td className={styles.colTitle}>
        <div className={styles.titleWrap}>
          <img src={track?.cover_src || DefaultCover} alt="Album cover" className={styles.thumb} loading="lazy" />
          <div style={{ minWidth: 0 }}>
            <TtlMarquee text={track?.title || '未知标题'} />
            <div className={styles.art} title={track?.artist || '未知艺术家'}>
              {track?.artist || '未知艺术家'}
            </div>
          </div>
        </div>
      </td>

      {/* 平台（图标渲染） */}
      <td className={`${styles.colAlbum} hidden md:table-cell`} title={track?.platform as any}>
        {track?.platform === 'NetEaseCloudMusic' && (
          <img src={NetEaseCloudMusic} alt="NetEaseCloudMusic"
               style={{ width: 18, height: 18, objectFit: 'contain' }} />
        )}
        {track?.platform === 'Hifini' && (
          <img src={Hifini} alt="Hifini" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        )}
        {track?.platform === 'QQMusic' && (
          <img src={QQMusic} alt="QQMusic" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        )}
        {track?.platform === 'Bilibili' && (
          <img src={Bilibili} alt="Bilibili" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        )}
        {track?.platform === 'YouTubeMusic' && (
          <img src={YouTubeMusic} alt="YouTubeMusic" style={{ width: 18, height: 18, objectFit: 'contain' }} />
        )}
      </td>

      {/* 添加日期（居中） */}
      <td className={`${styles.colDate} hidden lg:table-cell`}>
        {track?.created_at ? timeAgo(track.created_at) : '未知时间'}
      </td>

      {/* 时长（等宽数字） */}
      <td className={styles.colDur}>
        {track?.duration ? formatTime(track.duration) : '—'}
      </td>
    </tr>
  );
};

export default Track;
