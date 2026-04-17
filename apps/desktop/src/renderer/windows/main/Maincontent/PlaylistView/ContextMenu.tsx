import React, { useMemo } from 'react';
import styles from './ContextMenu.module.css';

import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import CommonContextMenu, { MenuItem } from '@components/ContextMenu/ContextMenu';
import {
  isChainLibraryPlaylist,
  notifyChainLibraryUpdated,
  removeChainLibraryTrack,
} from '@renderer/core/freeflow/chainLibrary';

interface ContextMenuProps {
  x: number;
  y: number;
  track: TrackEntity;
  player: PlayerController;
  handleCloseMenu: () => void;
  musicLibraryController: MusicLibraryController;
  onEditRequest?: (track: TrackEntity) => void;
  onDetailRequest?: (track: TrackEntity) => void;
}

export default function ContextMenu({
                                      x,
                                      y,
                                      track,
                                      handleCloseMenu,
                                      player,
                                      musicLibraryController,
                                      onEditRequest,
                                      onDetailRequest,
                                    }: ContextMenuProps) {
  if (!track) return null;

  const playlists = musicLibraryController.playlists ?? [];
  const activePlaylist = musicLibraryController.activePlaylist;
  const activeId = activePlaylist?.playlist_id;
  const activeIsChainLibrary = isChainLibraryPlaylist(activePlaylist);
  const candidatePlaylists = useMemo(() => playlists.filter(p => p.playlist_id !== activeId), [playlists, activeId]);

  const removeFromCurrent = async () => {
    const activePlaylistId = activePlaylist?.playlist_id ?? null;
    if (activePlaylistId === null) return;
    if (activeIsChainLibrary) await removeChainLibraryTrack(track);
    else if (activePlaylistId === 0) await libraryContext.removeTrackFromLibrary(track);
    else await playlistContext.removeTrackFromPlaylist(activePlaylistId, track);
    if (!activeIsChainLibrary) {
      await musicLibraryController.refreshPlaylists();
    } else if (activePlaylist) {
      musicLibraryController.activePlaylist = {
        ...activePlaylist,
        tracks: activePlaylist.tracks.filter((item) => item.id !== track.id),
      };
    }
  };

  const addToTarget = async (playlistId: number) => {
    if (playlistId === 0) await libraryContext.addTrackToLibrary(track);
    else await playlistContext.addTrackToPlaylist(track, playlistId);
    await musicLibraryController.refreshPlaylists();
  };

  const items: MenuItem[] = [
    { key: 'detail', icon: 'fas fa-info-circle', label: '查看详情', onClick: () => onDetailRequest?.(track) },
    { key: 'next', icon: 'fas fa-forward', label: '添加到下一首播放', onClick: () => player.addTrackToNext(track) },
    {
      key: 'add_to', icon: 'fas fa-folder-plus', label: '添加到…', submenu: candidatePlaylists.map(pl => ({
        key: `pl_${pl.playlist_id}`,
        icon: 'fas fa-list',
        label: pl.title === 'Library' ? '库' : pl.title,
        onClick: () => addToTarget(pl.playlist_id!),
      })),
    },
    { key: 'sep1', label: <div className={styles.divider} />, onClick: undefined },
    {
      key: 'remove',
      icon: 'fas fa-xmark',
      label: `从 ${activePlaylist?.title ?? '当前'} 中移除`,
      onClick: removeFromCurrent,
    },
    { key: 'edit', icon: 'fas fa-pen', label: '编辑歌曲信息', onClick: () => onEditRequest?.(track) },
    {
      key: 'download', icon: 'fas fa-download', label: '下载', onClick: async () => {
        const updated = await libraryContext.downloadTrack(track);
        if (activeIsChainLibrary && activePlaylist) {
          musicLibraryController.activePlaylist = {
            ...activePlaylist,
            tracks: activePlaylist.tracks.map((item) => item.id === updated.id ? updated : item),
          };
          notifyChainLibraryUpdated();
        } else {
          await musicLibraryController.refreshPlaylists();
        }
      },
    },
  ];

  return (
    <CommonContextMenu x={x} y={y} onRequestClose={handleCloseMenu} items={items} />
  );
}
