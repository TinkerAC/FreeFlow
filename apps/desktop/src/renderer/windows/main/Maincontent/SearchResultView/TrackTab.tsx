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

  const featured = tracks[0];
  const listTracks = tracks;

  const openTrack = (track: TrackEntity) => {
    if (track.platform === Platform.FREEFLOW) {
      navigation.push(ViewType.FREEFLOW_TRACK_DETAIL, track);
      return;
    }
    player.addTrackToNextAndPlay(track);
  };

  const renderPlatformMeta = (track: TrackEntity) => {
    if (track.platform === Platform.FREEFLOW) {
      const price = track.freeflow?.priceEth ? `${track.freeflow.priceEth} ETH` : '链上资源';
      const access = track.freeflow?.accessModel || 'FreeFlow';
      return `${access} · ${price}`;
    }
    return track.platform;
  };

  return (
    <div className={styles.tracksLayout}>
      {featured && (
        <section className={styles.featuredBlock}>
          <div className={styles.sectionTitle}>热门结果</div>
          <div
            className={`${styles.row} ${styles.big}`}
            onClick={() => openTrack(featured)}
            onContextMenu={(e) => onContextMenu(e, featured)}
          >
            <img
              src={featured.cover_src || DefaultCover}
              alt={featured.title || 'cover'}
              referrerPolicy="no-referrer"
              className={styles.cover}
            />
            <div className={styles.mainText}>
              <div className={styles.title}>{featured.title || '未知标题'}</div>
              <div className={styles.sub}>{featured.artist || '未知艺术家'}</div>
              <div className={styles.badgeLine}>
                <PlatformIcon platform={featured.platform} size={16} />
                <span>{renderPlatformMeta(featured)}</span>
              </div>
            </div>
            <div className={styles.meta}>
              {featured.platform === Platform.FREEFLOW ? '详情' : '播放'}
            </div>
          </div>
        </section>
      )}

      <section className={styles.listBlock}>
        <div className={styles.sectionTitle}>歌曲列表</div>
        <div className={styles.list}>
          {listTracks.map((t, i) => (
            <div
              key={`${t.platform}_${t.platform_unique_id}_${i}`}
              className={styles.row}
              onClick={() => openTrack(t)}
              onContextMenu={(e) => onContextMenu(e, t)}
            >
              <img
                src={t.cover_src || DefaultCover}
                alt={t.title || 'cover'}
                referrerPolicy="no-referrer"
                className={styles.cover}
              />
              <div className={styles.mainText}>
                <div className={styles.title}>{t.title || '未知标题'}</div>
                <div className={styles.sub}>{t.artist || '未知艺术家'}</div>
              </div>
              <div className={styles.meta}>
                {Number.isFinite(t.duration) ? <span>{Math.round(t.duration)}s</span> : null}
                <PlatformIcon platform={t.platform} size={16} />
                <span>{t.platform === Platform.FREEFLOW ? '详情' : '播放'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
