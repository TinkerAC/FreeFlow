import React from 'react';
import styles from './ListRow.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Hifini, NetEaseCloudMusic, QQMusic } from '@components/static';

function PlatformIcon({ platform }: { platform: string }) {
  const size = 18;
  const common = { width: size, height: size, objectFit: 'contain' } as const;
  if (platform === 'NetEaseCloudMusic') return <img src={NetEaseCloudMusic} alt={platform} style={common} />;
  if (platform === 'Hifini')           return <img src={Hifini} alt={platform} style={common} />;
  if (platform === 'QQMusic')          return <img src={QQMusic} alt={platform} style={common} />;
  return null;
}

export default function TracksTab({
                                    tracks, player, onContextMenu,
                                  }: { tracks: TrackEntity[]; player: PlayerController; onContextMenu:(e:React.MouseEvent<HTMLDivElement>, t:TrackEntity)=>void; }) {
  if (!tracks?.length) return <div style={{ opacity:.7 }}>没有找到歌曲。</div>;

  return (
    <div style={{ display:'grid', gap:8 }}>
      {tracks.map((t, i) => (
        <div
          key={`${t.platform}_${t.platform_unique_id}_${i}`}
          className={styles.row}
          onDoubleClick={() => player.addTrackToNextAndPlay(t)}
          onContextMenu={(e) => onContextMenu(e, t)}
        >
          <img src={t.cover_src} alt={t.title} className={styles.cover} />
          <div style={{ minWidth:0 }}>
            <div className={styles.title}>{t.title}</div>
            <div className={styles.sub}>{t.artist}</div>
          </div>
          <div className={styles.meta}>
            {Number.isFinite(t.duration) ? `${Math.round(t.duration)}s` : ''}
            &nbsp; <PlatformIcon platform={t.platform} />
          </div>
        </div>
      ))}
    </div>
  );
}