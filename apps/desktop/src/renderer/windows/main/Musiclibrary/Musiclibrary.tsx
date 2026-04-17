import React, { useEffect, useMemo, useRef, useState } from 'react';
import Item from './Item';
import ContextMenu from './ContextMenu';
import { playlistContext } from '@renderer/core/electronContextApi';
import { DefaultPlaylistCover } from '@src/renderer/components/static';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './MusicLibrary.module.css';
import clsx from 'clsx';
import { Reorder } from 'framer-motion';
import {
  buildChainLibraryPlaylist,
  getChainLibraryTracks,
  isChainLibraryPlaylist,
  subscribeChainLibraryUpdated,
} from '@renderer/core/freeflow/chainLibrary';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';

interface MusicLibraryProps {
  musicLibraryController: MusicLibraryController;
}

export default function MusicLibrary({ musicLibraryController }: MusicLibraryProps) {
  const navigation = useNavigation();

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [eventPlaylist, setEventPlaylist] = useState<PlaylistEntity | null>(null);

  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [playlists, setPlaylists] = useState<PlaylistEntity[]>(musicLibraryController.playlists);
  const [selectedItem, setSelectedItem] = useState<number>(musicLibraryController.selectedLibraryItem || 0);
  const [chainTracks, setChainTracks] = useState<TrackEntity[]>([]);

  const rootRef = useRef<HTMLDivElement>(null);
  const playlistsRef = useRef(playlists);

  useEffect(() => {
    playlistsRef.current = playlists;
  }, [playlists]);

  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setCollapsed(musicLibraryController.isMusicLibraryCollapsed);
      setPlaylists(musicLibraryController.playlists);
      setSelectedItem(musicLibraryController.selectedLibraryItem || 0);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  const refreshChainLibrary = React.useCallback(async () => {
    const tracks = await getChainLibraryTracks();
    setChainTracks(tracks);
  }, []);

  useEffect(() => {
    void refreshChainLibrary();
    return subscribeChainLibraryUpdated(() => {
      void refreshChainLibrary();
    });
  }, [refreshChainLibrary]);

  const chainPlaylist = useMemo(() => buildChainLibraryPlaylist(chainTracks), [chainTracks]);
  const selectedChainLibrary = isChainLibraryPlaylist(musicLibraryController.activePlaylist);

  const handleRightClick = (e: React.MouseEvent, playlistId: number) => {
    e.preventDefault();
    if (playlistId <= 0) return;

    const p = playlists.find((playlist) => playlist.playlist_id === playlistId) || null;
    setEventPlaylist(p);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setContextMenuVisible(false);
    setEventPlaylist(null);
  };

  useEffect(() => {
    const close = () => contextMenuVisible && handleCloseMenu();
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenuVisible]);

  const handleReorder = (newOrder: PlaylistEntity[]) => {
    setPlaylists(newOrder);
  };

  const handleDragEnd = async () => {
    const currentPlaylists = playlistsRef.current;
    const updates = currentPlaylists
      .filter((playlist) => playlist.playlist_id && playlist.playlist_id > 0)
      .map((playlist, index) => ({
        playlist_id: playlist.playlist_id!,
        position: index,
      }));

    try {
      await playlistContext.updatePlaylistPositions(updates);
      await musicLibraryController.refreshPlaylists();
    } catch (error) {
      console.error('Failed to update playlist positions:', error);
    }
  };

  return (
    <aside ref={rootRef} className={clsx(styles.root, collapsed && styles.collapsed)}>
      <div className={styles.header}>
        <button
          className={clsx(styles.iconBtn, styles.menuBtn)}
          title={collapsed ? '展开音乐库' : '收起音乐库'}
          onClick={() => musicLibraryController.toggleMusicLibraryCollapse()}
        >
          <i className="fas fa-bars" />
        </button>

        {!collapsed && <div className={styles.title}>音乐库</div>}

        {!collapsed && (
          <div className={styles.headerActions}>
            <button
              className={clsx(styles.iconBtn, styles.addBtn)}
              title="新建歌单"
              onClick={() => playlistContext.createPlaylist().then(musicLibraryController.refreshPlaylists)}
            >
              <i className="fas fa-plus" />
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className={styles.toolbar}>
          <button className={clsx(styles.chip, styles.chipActive)}>歌单</button>
          <button className={styles.chip}>链上资源 {chainTracks.length}</button>
          <div style={{ marginLeft: 'auto', opacity: .8 }}>
            <i className="fas fa-cube" title="链上音乐库" />
          </div>
        </div>
      )}

      <div className={styles.scroll}>
        {!collapsed && (
          <Reorder.Group
            axis="y"
            values={playlists}
            onReorder={handleReorder}
            className={styles.list}
          >
            <Item
              imgSrc={chainPlaylist?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
              altText="链上音乐库"
              title={chainPlaylist.title}
              description={chainPlaylist.description || ''}
              index={-1}
              isSelected={selectedChainLibrary}
              onClick={() => {
                musicLibraryController.activePlaylist = chainPlaylist;
                navigation.push(ViewType.PLAYLIST);
              }}
              onRightClick={(e) => handleRightClick(e, chainPlaylist.playlist_id)}
            />
            {playlists.length ? (
              playlists.map((item, index) => {
                return (
                  <Reorder.Item
                    key={item.playlist_id}
                    value={item}
                    onDragEnd={handleDragEnd}
                    className={styles.reorderItem}
                    whileDrag={{ scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 10 }}
                  >
                    <Item
                      imgSrc={item?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                      altText={`${item.title} key:${item.playlist_id}`}
                      title={item.title}
                      description={item.description || ''}
                      index={index}
                      isSelected={!selectedChainLibrary && selectedItem === index}
                      onClick={() => {
                        musicLibraryController.selectItem(index);
                        musicLibraryController.activePlaylist = item;
                        navigation.push(ViewType.PLAYLIST);
                      }}
                      onRightClick={(e) => handleRightClick(e, item.playlist_id)}
                    />
                  </Reorder.Item>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>暂无歌单</div>
            )}
          </Reorder.Group>
        )}

        {collapsed && (
          <Reorder.Group
            axis="y"
            values={playlists}
            onReorder={handleReorder}
            className={styles.grid}
          >
            <div
              className={clsx(styles.tile, selectedChainLibrary && styles.tileSelected)}
              onClick={() => {
                musicLibraryController.activePlaylist = chainPlaylist;
                navigation.push(ViewType.PLAYLIST);
              }}
              title={chainPlaylist.title}
              tabIndex={0}
            >
              <img
                src={chainPlaylist?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                alt="链上音乐库"
                draggable={false}
              />
            </div>
            {playlists.map((item, index) => {
              return (
                <Reorder.Item
                  key={item.playlist_id}
                  value={item}
                  onDragEnd={handleDragEnd}
                  className={styles.reorderItem}
                  whileDrag={{ scale: 1.1, zIndex: 10 }}
                >
                  <div
                    className={clsx(styles.tile, !selectedChainLibrary && selectedItem === index && styles.tileSelected)}
                    onClick={() => {
                      musicLibraryController.selectItem(index);
                      musicLibraryController.activePlaylist = item;
                      navigation.push(ViewType.PLAYLIST);
                    }}
                    onContextMenu={(e) => handleRightClick(e, item.playlist_id)}
                    title={item.title}
                    tabIndex={0}
                  >
                    <img
                      src={item?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                      alt={`${item.title} key:${item.playlist_id}`}
                      draggable={false}
                    />
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}
      </div>

      {contextMenuVisible && eventPlaylist && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          eventPlaylist={eventPlaylist}
          handleCloseMenu={handleCloseMenu}
          musicLibraryController={musicLibraryController}
        />
      )}
    </aside>
  );
}
