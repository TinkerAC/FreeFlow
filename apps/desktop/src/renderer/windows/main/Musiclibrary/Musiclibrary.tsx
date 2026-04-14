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
import { Platform } from '@main/core/enum/Platform';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { syncOwnedFreeFlowLibrary } from '@renderer/core/freeflow/ownedLibrary';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';

interface MusicLibraryProps {
  musicLibraryController: MusicLibraryController;
}

const CHAIN_LIBRARY_TITLE = '链上音乐库';
const CHAIN_LIBRARY_DESC = '当前钱包拥有访问权的链上资源';

function asDisplayPlaylist(playlist: PlaylistEntity): PlaylistEntity {
  if (playlist.playlist_id !== 0) {
    return playlist;
  }

  return {
    ...playlist,
    platform: Platform.FREEFLOW,
    platform_unique_id: 'freeflow-library',
    title: CHAIN_LIBRARY_TITLE,
    description: CHAIN_LIBRARY_DESC,
    tracks: (playlist.tracks || []).filter((track) => track.platform === Platform.FREEFLOW),
  };
}

export default function MusicLibrary({ musicLibraryController }: MusicLibraryProps) {
  const navigation = useNavigation();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [eventPlaylist, setEventPlaylist] = useState<PlaylistEntity | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [playlists, setPlaylists] = useState<PlaylistEntity[]>(musicLibraryController.playlists);
  const [selectedItem, setSelectedItem] = useState<number>(musicLibraryController.selectedLibraryItem || 0);

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

  const displayedPlaylists = useMemo(() => playlists.map(asDisplayPlaylist), [playlists]);

  const syncOwnedTracks = React.useCallback(async () => {
    if (!address || !walletProvider) return;
    setSyncing(true);
    setSyncError('');
    try {
      await syncOwnedFreeFlowLibrary({
        baseUrl: web25BaseUrl.value,
        walletProvider,
        account: address,
      });
      await musicLibraryController.refreshPlaylists();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : String(error ?? '同步失败'));
    } finally {
      setSyncing(false);
    }
  }, [address, musicLibraryController, walletProvider, web25BaseUrl.value]);

  useEffect(() => {
    if (!isConnected || !address || !walletProvider) return;
    void syncOwnedTracks();
  }, [address, isConnected, syncOwnedTracks, walletProvider]);

  const handleRightClick = (e: React.MouseEvent, playlistId: number) => {
    e.preventDefault();
    if (playlistId === 0) return;

    const p = displayedPlaylists.find((playlist) => playlist.playlist_id === playlistId) || null;
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
      .filter((playlist) => playlist.playlist_id !== 0)
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
            <button
              className={styles.iconBtn}
              title="同步已拥有资源"
              onClick={() => void syncOwnedTracks()}
              disabled={!isConnected || !address || !walletProvider || syncing}
            >
              <i className={syncing ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right'} />
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className={styles.toolbar}>
          <button className={clsx(styles.chip, styles.chipActive)}>歌单</button>
          <button className={styles.chip}>{isConnected ? '钱包已连接' : '钱包未连接'}</button>
          <div style={{ marginLeft: 'auto', opacity: .8 }}>
            <i className="fas fa-cube" title="链上资源同步" />
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
            {playlists.length ? (
              playlists.map((item, index) => {
                const displayItem = asDisplayPlaylist(item);
                return (
                  <Reorder.Item
                    key={item.playlist_id}
                    value={item}
                    onDragEnd={handleDragEnd}
                    className={styles.reorderItem}
                    whileDrag={{ scale: 1.02, boxShadow: '0 8px 20px rgba(0,0,0,0.15)', zIndex: 10 }}
                  >
                    <Item
                      imgSrc={displayItem?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                      altText={`${displayItem.title} key:${displayItem.playlist_id}`}
                      title={displayItem.title}
                      description={displayItem.description || ''}
                      index={index}
                      isSelected={selectedItem === index}
                      onClick={() => {
                        musicLibraryController.selectItem(index);
                        musicLibraryController.activePlaylist = displayItem;
                        navigation.push(ViewType.PLAYLIST);
                      }}
                      onRightClick={(e) => handleRightClick(e, displayItem.playlist_id)}
                    />
                  </Reorder.Item>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>暂无歌单</div>
            )}
            {!!syncError && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'rgb(var(--md-sys-color-error))' }}>{syncError}</div>
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
            {playlists.map((item, index) => {
              const displayItem = asDisplayPlaylist(item);
              return (
                <Reorder.Item
                  key={item.playlist_id}
                  value={item}
                  onDragEnd={handleDragEnd}
                  className={styles.reorderItem}
                  whileDrag={{ scale: 1.1, zIndex: 10 }}
                >
                  <div
                    className={clsx(styles.tile, selectedItem === index && styles.tileSelected)}
                    onClick={() => {
                      musicLibraryController.selectItem(index);
                      musicLibraryController.activePlaylist = displayItem;
                      navigation.push(ViewType.PLAYLIST);
                    }}
                    onContextMenu={(e) => handleRightClick(e, displayItem.playlist_id)}
                    title={displayItem.title}
                    tabIndex={0}
                  >
                    <img
                      src={displayItem?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                      alt={`${displayItem.title} key:${displayItem.playlist_id}`}
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
