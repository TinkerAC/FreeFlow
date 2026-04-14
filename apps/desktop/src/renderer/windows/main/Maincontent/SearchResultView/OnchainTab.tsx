import React from 'react';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import PlayerController from '@renderer/core/controller/PlayerController';
import { PlatformIcon } from '@components/PlatformIcon';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import styles from './OnchainTab.module.css';

function formatPrice(priceEth: string | null | undefined) {
  if (!priceEth) return '-';
  return `${priceEth} ETH`;
}

export default function OnchainTab({
  tracks,
  player,
  onContextMenu,
}: {
  tracks: TrackEntity[];
  player: PlayerController;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>, t: TrackEntity) => void;
}) {
  const navigation = useNavigation();

  if (!tracks.length) {
    return <div style={{ opacity: 0.7 }}>没有链上资源结果。</div>;
  }

  return (
    <div className={styles.root}>
      {tracks.map((track, index) => (
        <div
          key={`${track.platform}_${track.platform_unique_id}_${index}`}
          className={styles.row}
          onDoubleClick={() => player.addTrackToNextAndPlay(track)}
          onContextMenu={(event) => onContextMenu(event, track)}
        >
          <div className={styles.main}>
            <div className={styles.title}>{track.title}</div>
            <div className={styles.sub}>
              {track.artist || 'Unknown Artist'}
              <span className={styles.dot}>·</span>
              <PlatformIcon platform={track.platform} size={14} />
              <span>{track.platform}</span>
            </div>
          </div>

          <div className={styles.price}>{formatPrice(track.freeflow?.priceEth)}</div>
          <div className={styles.access}>{track.freeflow?.accessModel || '-'}</div>
          <div className={styles.token}>#{track.freeflow?.tokenId || '-'}</div>
          <button
            className={styles.detailButton}
            onClick={(event) => {
              event.stopPropagation();
              navigation.push(ViewType.FREEFLOW_TRACK_DETAIL, track);
            }}
          >详情
          </button>
        </div>
      ))}
    </div>
  );
}
