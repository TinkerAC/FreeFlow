import React from 'react';
import styles from './ListRow.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { Platform } from '@main/core/enum/Platform';
import { useNavigation, ViewType } from '@renderer/core/navigation';

export default function TracksTab({
                                    tracks, player, onContextMenu,
                                  }: {
  tracks: TrackEntity[];
  player: PlayerController;
  onContextMenu: (e: React.MouseEvent<HTMLDivElement>, t: TrackEntity) => void;
}) {
  const navigation = useNavigation();

  if (!tracks?.length) return <div style={{ opacity: .7 }}>没有找到歌曲。</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }} className={styles.noScrollbar}>
      {tracks.map((t, i) => (
        <div
          key={`${t.platform}_${t.platform_unique_id}_${i}`}
          className={styles.row}
          onDoubleClick={() => player.addTrackToNextAndPlay(t)}
          onContextMenu={(e) => onContextMenu(e, t)}
        >
          <img src={t.cover_src || DefaultCover}
               alt={t.title}
               referrerPolicy="no-referrer"
               className={styles.cover} />
          <div style={{ minWidth: 0 }}>
            <div className={styles.title}>{t.title}</div>
            <div className={styles.sub}>{t.artist}</div>
          </div>
          <div className={styles.meta}>
            {Number.isFinite(t.duration) ? `${Math.round(t.duration)}s` : ''}
            &nbsp; <PlatformIcon platform={t.platform} />
            {t.platform === Platform.FREEFLOW && (
              <button
                className={styles.inlineDetailBtn}
                onClick={(event) => {
                  event.stopPropagation();
                  navigation.push(ViewType.FREEFLOW_TRACK_DETAIL, t);
                }}
              >详情
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
