// file: src/renderer/components/Musiclibrary/Musiclibrary.tsx
import React, { useEffect, useRef, useState } from 'react';
import Item from './Item';
import ContextMenu from './ContextMenu';
import { playlistContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import styles from './MusicLibrary.module.css';
import clsx from 'clsx';

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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragPosition, setDragPosition] = useState<'top' | 'bottom' | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);

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

  // 拖拽处理
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null) {
      setDragOverIndex(index);
      // 判断鼠标在目标元素的上半还是下半，决定分割线显示在上/下
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const midY = rect.top + rect.height / 2;
      setDragPosition(mouseY < midY ? 'top' : 'bottom');
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) {
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }

    // 重新排序歌单
    const newPlaylists = [...playlists];
    const draggedPlaylist = newPlaylists[draggedIndex];
    newPlaylists.splice(draggedIndex, 1);
    // 计算实际插入位置：当分割线在目标元素下方时，插入到其后一个位置
    let actualDropIndex = dropIndex;
    if (dragPosition === 'bottom') actualDropIndex = dropIndex + 1;
    // 如果移除位置在插入位置之前，插入索引需要 -1
    const finalDropIndex = draggedIndex < actualDropIndex ? actualDropIndex - 1 : actualDropIndex;
    // 拖回原位（无变化）的保护
    if (finalDropIndex === draggedIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDragPosition(null);
      return;
    }
    newPlaylists.splice(finalDropIndex, 0, draggedPlaylist);

    // 更新位置
    const updates = newPlaylists.map((playlist, index) => ({
      playlist_id: playlist.playlist_id!,
      position: index,
    }));

    try {
      await playlistContext.updatePlaylistPositions(updates);
      await musicLibraryController.refreshPlaylists();
      
      // 更新选中项
      if (selectedItem === draggedIndex) {
        setSelectedItem(finalDropIndex);
        musicLibraryController.selectItem(finalDropIndex);
      } else if (draggedIndex < finalDropIndex) {
        // 向后拖动：被跨越的选中项索引 -1
        if (selectedItem > draggedIndex && selectedItem <= finalDropIndex) {
          setSelectedItem(selectedItem - 1);
          musicLibraryController.selectItem(selectedItem - 1);
        }
      } else {
        // 向前拖动：被跨越的选中项索引 +1
        if (selectedItem >= finalDropIndex && selectedItem < draggedIndex) {
          setSelectedItem(selectedItem + 1);
          musicLibraryController.selectItem(selectedItem + 1);
        }
      }
    } catch (error) {
      console.error('Failed to update playlist positions:', error);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDragPosition(null);
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
          <div className={styles.list}>
            {playlists.length ? (
              (() => {
                const nodes: React.ReactNode[] = [];
                playlists.forEach((item, index) => {
                  // 分割线（上）
                  if (draggedIndex !== null && dragOverIndex === index && dragPosition === 'top') {
                    nodes.push(<div key={`div-top-${index}`} className={styles.dragDivider} />);
                  }
                  nodes.push(
                    <Item
                      key={item.playlist_id}
                      imgSrc={item?.tracks?.[0]?.cover_src || '../assets/default-playlist-cover.png'}
                      altText={`${item.title} key:${item.playlist_id}`}
                      title={item.title}
                      description={item.description || ''}
                      index={index}
                      isSelected={selectedItem === index}
                      isDragging={draggedIndex === index}
                      onClick={() => {
                        musicLibraryController.selectItem(index);
                        musicLibraryController.activePlaylist = item;
                        navigation.push(ViewType.PLAYLIST);
                      }}
                      onRightClick={(e) => handleRightClick(e, item.playlist_id)}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    />
                  );
                  // 分割线（下）
                  if (draggedIndex !== null && dragOverIndex === index && dragPosition === 'bottom') {
                    nodes.push(<div key={`div-btm-${index}`} className={styles.dragDivider} />);
                  }
                });
                // 拖到最后一个元素的下方（末尾插入）
                if (draggedIndex !== null && dragOverIndex === playlists.length && dragPosition === 'bottom') {
                  nodes.push(<div key={`div-end`} className={styles.dragDivider} />);
                }
                // 末尾接收区：仅在拖拽时提供 drop 区域
                nodes.push(
                  <div
                    key="end-drop-zone"
                    className={styles.endDropZone}
                    onDragOver={(e) => {
                      if (draggedIndex !== null) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverIndex(playlists.length);
                        setDragPosition('bottom');
                      }
                    }}
                    onDrop={(e) => {
                      if (draggedIndex !== null) {
                        setDragPosition('bottom');
                        handleDrop(e, Math.max(0, playlists.length - 1));
                      }
                    }}
                  />
                );
                return nodes;
              })()
            ) : (
              <div style={{ textAlign: 'center', color: 'rgb(var(--md-sys-color-on-surface-variant))' }}>暂无歌单</div>
            )}
          </div>
        )}

        {/* 收起态：单列图标网格 */}
        {collapsed && (
          <div className={styles.grid}>
            {(() => {
              const nodes: React.ReactNode[] = [];
              playlists.forEach((item, index) => {
                // 分割线（上）
                if (draggedIndex !== null && dragOverIndex === index && dragPosition === 'top') {
                  nodes.push(<div key={`gdiv-top-${index}`} className={clsx(styles.dragDivider, styles.dragDividerSmall)} />);
                }
                nodes.push(
                  <div
                    key={item.playlist_id}
                    className={clsx(styles.tile, selectedItem === index && styles.tileSelected)}
                    draggable
                    onClick={() => {
                      musicLibraryController.selectItem(index);
                      musicLibraryController.activePlaylist = item;
                      navigation.push(ViewType.PLAYLIST);
                    }}
                    onContextMenu={(e) => handleRightClick(e, item.playlist_id)}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverIndex(index);
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const mouseY = e.clientY;
                      const midY = rect.top + rect.height / 2;
                      setDragPosition(mouseY < midY ? 'top' : 'bottom');
                    }}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    title={item.title}
                    tabIndex={0}
                  >
                    <img
                      src={item?.tracks?.[0]?.cover_src || '../assets/default-playlist-cover.png'}
                      alt={`${item.title} key:${item.playlist_id}`}
                    />
                  </div>
                );
                // 分割线（下）
                if (draggedIndex !== null && dragOverIndex === index && dragPosition === 'bottom') {
                  nodes.push(<div key={`gdiv-btm-${index}`} className={clsx(styles.dragDivider, styles.dragDividerSmall)} />);
                }
              });
              if (draggedIndex !== null && dragOverIndex === playlists.length && dragPosition === 'bottom') {
                nodes.push(<div key={`gdiv-end`} className={clsx(styles.dragDivider, styles.dragDividerSmall)} />);
              }
              // 末尾接收区（收起态）
              nodes.push(
                <div
                  key="g-end-drop-zone"
                  className={styles.endDropZone}
                  onDragOver={(e) => {
                    if (draggedIndex !== null) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverIndex(playlists.length);
                      setDragPosition('bottom');
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedIndex !== null) {
                      setDragPosition('bottom');
                      handleDrop(e, Math.max(0, playlists.length - 1));
                    }
                  }}
                />
              );
              return nodes;
            })()}
          </div>
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