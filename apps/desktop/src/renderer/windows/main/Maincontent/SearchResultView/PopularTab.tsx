import React from 'react';
import styles from './ListRow.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { DefaultCover } from '@components/static';
import { Platform } from '@main/core/enum/Platform';
import { useNavigation, ViewType } from '@renderer/core/navigation';

export default function PopularTab({
                                     track, player, onContextMenu,
                                   }: {
  track?: TrackEntity;
  player: PlayerController;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>, t: TrackEntity) => void;
}) {
  const navigation = useNavigation();

  if (!track) return <div style={{ opacity: .7 }}>没有找到热门结果。</div>;

  return (
    <div
      className={`${styles.row} ${styles.big}`}
      onDoubleClick={() => player.addTrackToNextAndPlay(track)}
      onContextMenu={(e) => onContextMenu(e, track)}
    >
      <img src={track.cover_src || DefaultCover} alt={track.title} className={styles.cover} />
      <div style={{ minWidth: 0 }}>
        <div className={styles.title}>{track.title}</div>
        <div className={styles.sub}>歌曲 · {track.artist}</div>
        {track.platform === Platform.FREEFLOW && (
          <button
            className={styles.inlineDetailBtn}
            onClick={(event) => {
              event.stopPropagation();
              navigation.push(ViewType.FREEFLOW_TRACK_DETAIL, track);
            }}
          >查看链上详情
          </button>
        )}
      </div>
    </div>
  );
}
