// file: src/renderer/components/Musiclibrary/ContextMenu.tsx
import React, { useEffect } from 'react';
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import CommonContextMenu, { MenuItem } from '@renderer/components/common/ContextMenu/ContextMenu';

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

  const playlists = musicLibraryController.playlists ?? [];
  const candidates = playlists.filter(p => p.playlist_id !== eventPlaylist?.playlist_id);

  const moveAllTo = async (targetId: number) => {
    try {
      const tracks = eventPlaylist?.tracks ?? [];
      for (const t of tracks) {
        await playlistContext.addTrackToPlaylist(t, targetId);
      }
      await musicLibraryController.refreshPlaylists();
    } finally {
      handleCloseMenu();
    }
  };

  const items: MenuItem[] = [
    {
      key: 'move_all',
      icon: 'fas fa-share-from-square',
      label: '将此歌单所有曲目添加到…',
      submenu: candidates.map((p) => ({
        key: `to_${p.playlist_id}`,
        icon: 'fas fa-list',
        label: p.title === 'Library' ? '库' : p.title,
        onClick: () => moveAllTo(p.playlist_id!),
      })),
    },
    {
      key: 'delete',
      icon: 'fas fa-trash',
      label: '删除歌单',
      onClick: () => playlistContext.removePlaylist(eventPlaylist.playlist_id).then(() => musicLibraryController.refreshPlaylists()),
    },
  ];

  return (
    <CommonContextMenu x={x} y={y} onRequestClose={handleCloseMenu} items={items} />
  );
}

export default ContextMenu;
