// file: src/renderer/components/Musiclibrary/Musiclibrary.tsx
import React, { useEffect, useRef, useState } from 'react';
import Item from './Item';
import ContextMenu from './ContextMenu';
import { playlistContext } from '@renderer/core/electronContextApi';
import {DefaultPlaylistCover} from "@src/renderer/components/static";
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './MusicLibrary.module.css';
import clsx from 'clsx';
import { Reorder } from 'framer-motion';

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

  // 右键
  const handleRightClick = (e: React.MouseEvent, playlist_id: number) => {
    e.preventDefault();
    const p = playlists.find(p => p.playlist_id === playlist_id) || null;
    setEventPlaylist(p);
    setContextMenuPosition({ x: e.clientX, y: e.clientY }); // Portal 为 fixed，直接用 client 坐标
    setContextMenuVisible(true);
  };
  const handleCloseMenu = () => {
    setContextMenuVisible(false);
    setEventPlaylist(null);
  };

  // 点击空白关闭
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
    const updates = currentPlaylists.map((playlist, index) => ({
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
      {/* 头部 */}
      <div className={styles.header}>
        {/* 左：汉堡按钮（收起/展开） */}
        <button
          className={clsx(styles.iconBtn, styles.menuBtn)}
          title={collapsed ? '展开音乐库' : '收起音乐库'}
          onClick={() => musicLibraryController.toggleMusicLibraryCollapse()}
        >
          <i className="fas fa-bars" />
        </button>

        {/* 中：标题（收起态完全不渲染） */}
        {!collapsed && <div className={styles.title}>音乐库</div>}

        {/* 右：新增（仅展开态可见，样式控制） */}
        <button
          className={clsx(styles.iconBtn, styles.addBtn)}
          title="新建歌单"
          onClick={() => playlistContext.createPlaylist().then(musicLibraryController.refreshPlaylists)}
        >
          <i className="fas fa-plus" />
        </button>
      </div>

      {/* 工具行（仅展开态显示） */}
      {!collapsed && (
        <div className={styles.toolbar}>
          <button className={clsx(styles.chip, styles.chipActive)}>歌单</button>
          <button className={styles.chip}>专辑</button>
          <div style={{ marginLeft: 'auto', opacity: .8 }}>
            <i className="fas fa-list" title="最近播放" />
          </div>
        </div>
      )}

      {/* 列表滚动区（唯一滚动） */}
      <div className={styles.scroll}>
        {/* 展开态：纵向列表 */}
        {!collapsed && (
          <Reorder.Group
            axis="y"
            values={playlists}
            onReorder={handleReorder}
            className={styles.list}
          >
            {playlists.length ? (
              playlists.map((item, index) => (
                <Reorder.Item
                  key={item.playlist_id}
                  value={item}
                  onDragEnd={handleDragEnd}
                  className={styles.reorderItem}
                  whileDrag={{ scale: 1.02, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", zIndex: 10 }}
                >
                  <Item
                    imgSrc={item?.tracks?.[0]?.cover_src || DefaultPlaylistCover}
                    altText={`${item.title} key:${item.playlist_id}`}
                    title={item.title}
                    description={item.description || ''}
                    index={index}
                    isSelected={selectedItem === index}
                    onClick={() => {
                      musicLibraryController.selectItem(index);
                      musicLibraryController.activePlaylist = item;
                      navigation.push(ViewType.PLAYLIST);
                    }}
                    onRightClick={(e) => handleRightClick(e, item.playlist_id)}
                  />
                </Reorder.Item>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>暂无歌单</div>
            )}
          </Reorder.Group>
        )}

        {/* 收起态：单列图标网格 */}
        {collapsed && (
          <Reorder.Group
            axis="y"
            values={playlists}
            onReorder={handleReorder}
            className={styles.grid}
          >
            {playlists.map((item, index) => (
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
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* 右键菜单 */}
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