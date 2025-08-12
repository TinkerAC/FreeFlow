// file: src/renderer/components/Musiclibrary/ContextMenu.tsx
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import styles from './MusicLibrary.module.css';

interface ContextMenuProps {
  x: number;
  y: number;
  handleCloseMenu: () => void;
  eventPlaylist: PlaylistEntity;
  musicLibraryController: MusicLibraryController;
}

function ContextMenu({
                       x, y, handleCloseMenu, eventPlaylist, musicLibraryController,
                     }: ContextMenuProps) {

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && handleCloseMenu();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [handleCloseMenu]);

  // 视口边界保护（避免超出可视区域）
  const vw = window.innerWidth, vh = window.innerHeight;
  const left = Math.min(Math.max(8, x), vw - 208);
  const top  = Math.min(Math.max(8, y), vh - 120);

  return createPortal(
    <div className={styles.menu} style={{ left, top }} onClick={(e)=>e.stopPropagation()}>
      <div
        className={styles.menuItem}
        onClick={() => {
          if (!eventPlaylist) return;
          playlistContext.removePlaylist(eventPlaylist.playlist_id)
            .then(() => musicLibraryController.refreshPlaylists());
          handleCloseMenu();
        }}
      >
        删除歌单
      </div>
    </div>,
    document.body,
  );
}

export default ContextMenu;
