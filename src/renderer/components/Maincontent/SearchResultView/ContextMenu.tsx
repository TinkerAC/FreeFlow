import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './ContextMenu.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

export default function ContextMenu({
                                      x, y, track, addToLibrary, handleCloseMenu, addTrackToPlaylist, playlists, player,
                                    }: {
  x: number; y: number; track: TrackEntity;
  addToLibrary: (t: TrackEntity) => void;
  handleCloseMenu: () => void;
  addTrackToPlaylist: (t: TrackEntity, id: number) => void;
  playlists: PlaylistEntity[];
  player: PlayerController;
}) {
  const [openSub, setOpenSub] = useState(false);
  if (!track) return null;

  // 视口防溢出：菜单宽 220 / 子菜单 220 / 高 逐项算
  const pos = useMemo(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const W = 220;
    const H = Math.min(320, 36 * Math.max(3, 2 + playlists.length));
    let nx = x, ny = y;
    if (nx + W > vw - 8) nx = vw - W - 8;
    if (ny + H > vh - 8) ny = vh - H - 8;
    return { left: nx, top: ny };
  }, [x, y, playlists.length]);

  return createPortal(
    <div className={styles.menu} style={pos} onContextMenu={(e) => e.preventDefault()}>
      <div className={styles.item} onClick={() => {
        player.addTrackToNext(track);
        handleCloseMenu();
      }}>
        添加到下一首播放
      </div>
      <div className={styles.sep} />
      <div
        className={`${styles.item} ${styles.subWrap}`}
        onMouseEnter={() => setOpenSub(true)}
        onMouseLeave={() => setOpenSub(false)}
      >
        添加到…
        {openSub && (
          <div className={styles.sub}>
            {playlists.map((p) => (
              <div
                key={p.playlist_id}
                className={styles.item}
                onClick={() => {
                  (p.playlist_id === 0 ? addToLibrary(track) : addTrackToPlaylist(track, p.playlist_id));
                  handleCloseMenu();
                }}
              >
                {p.title === 'Library' ? '库' : p.title}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}