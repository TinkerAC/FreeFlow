import React, { useLayoutEffect, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './ContextMenu.module.css';

import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';

interface ContextMenuProps {
  x: number;
  y: number;
  track: TrackEntity;
  player: PlayerController;
  handleCloseMenu: () => void;
  musicLibraryController: MusicLibraryController;
}

export default function ContextMenu({
                                      x, y, track, handleCloseMenu, player, musicLibraryController,
                                    }: ContextMenuProps) {

  // --- Refs ---
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const subMenuTimerRef = useRef<number | null>(null);

  // --- State ---
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);

  const playlists = musicLibraryController.playlists ?? [];
  const activeId = musicLibraryController.activePlaylist?.playlist_id;

  // --- Effects ---

  // 主菜单定位逻辑 (在 useLayoutEffect 中保持不变)
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    let finalLeft = x;
    let finalTop = y;

    if (finalLeft + rect.width + gap > window.innerWidth) {
      finalLeft = window.innerWidth - rect.width - gap;
    }
    if (finalTop + rect.height + gap > window.innerHeight) {
      finalTop = window.innerHeight - rect.height - gap;
    }

    finalLeft = Math.max(gap, finalLeft);
    finalTop = Math.max(gap, finalTop);

    setMenuStyle({
      left: finalLeft,
      top: finalTop,
      opacity: 1,
      transition: 'opacity .1s ease-in-out',
    });
  }, [x, y]);

  // 点击外部关闭逻辑 (保持不变, Portal 内的 Ref 依然有效)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const targetNode = e.target as Node;
      if (!menuRef.current?.contains(targetNode) && !subMenuRef.current?.contains(targetNode)) {
        handleCloseMenu();
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseMenu();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
      if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current);
    };
  }, [handleCloseMenu]);

  // --- Submenu Logic (保持不变) ---
  const openSubmenu = (rowEl: HTMLElement) => {
    if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current);
    if (subPos) return;
    const r = rowEl.getBoundingClientRect();
    const subW = 220, subH = 320, gap = 6;
    const preferRight = r.right + subW + gap < window.innerWidth;
    let left = preferRight ? r.right + gap : r.left - subW - gap;
    let top = r.top;
    if (top + subH > window.innerHeight) top = window.innerHeight - subH - 8;
    top = Math.max(8, top);
    setSubPos({ left, top });
  };

  const closeSubmenu = () => {
    subMenuTimerRef.current = window.setTimeout(() => setSubPos(null), 150);
  };

  if (!track) return null;

  // --- Handlers ---
  const removeFromCurrent = async () => {
    try {
      const activePlaylistId = musicLibraryController.activePlaylist?.playlist_id ?? null;
      if (activePlaylistId === null) return;

      // 特殊处理“音乐库”（id: 0）
      if (activePlaylistId === 0) {
        await libraryContext.removeTrackFromLibrary(track);
      } else {
        await playlistContext.removeTrackFromPlaylist(activePlaylistId, track);
      }

      await musicLibraryController.refreshPlaylists();
    } finally {
      handleCloseMenu();
    }
  };

  const addToTarget = async (playlistId: number) => {
    try {
      if (playlistId === 0) {
        await libraryContext.addTrackToLibrary(track);
      } else {
        await playlistContext.addTrackToPlaylist(track, playlistId);
      }
      // 刷新以反映变化（无论是否为当前激活歌单）
      await musicLibraryController.refreshPlaylists();
    } finally {
      handleCloseMenu();
    }
  };
  const candidatePlaylists = useMemo(() => playlists.filter(p => p.playlist_id !== activeId), [playlists, activeId]);

  // --- Render ---

  // ✅ [修复] 将所有内容都包裹在一个 Portal 中
  return createPortal(
    <>
      {/* 1. 主菜单 */}
      <div
        ref={menuRef}
        className={styles.menu}
        role="menu"
        style={menuStyle}
      >
        <button
          className={styles.item}
          role="menuitem"
          onClick={() => { player.addTrackToNext(track); handleCloseMenu(); }}
        >
          <span className={clsx('fas fa-forward', styles.icon)} />
          <span>添加到下一首播放</span>
          <span className={styles.kbd}>Enter</span>
        </button>

        <div
          className={clsx(styles.item, styles.subWrap)}
          role="menuitem"
          onMouseEnter={(e) => openSubmenu(e.currentTarget)}
          onMouseLeave={closeSubmenu}
        >
          <span className={clsx('fas fa-folder-plus', styles.icon)} />
          <span>添加到…</span>
          <span className={clsx('fas fa-chevron-right', styles.subCaret)} />
        </div>

        <div className={styles.divider} />

        <button className={styles.item} role="menuitem" onClick={removeFromCurrent}>
          <span className={clsx('fas fa-xmark', styles.icon)} />
          <span>从 {musicLibraryController.activePlaylist?.title ?? '当前'} 中移除</span>
        </button>

        <button
          className={styles.item}
          role="menuitem"
          onClick={async () => { await libraryContext.downFromHifini(track); handleCloseMenu(); }}
        >
          <span className={clsx('fas fa-download', styles.icon)} />
          <span>下载</span>
        </button>
      </div>

      {/* 2. 子菜单 (作为主菜单的兄弟节点，而不是子节点) */}
      {subPos && (
        <div
          ref={subMenuRef}
          className={styles.subMenu}
          style={{ left: subPos.left, top: subPos.top }}
          onMouseEnter={() => { if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current); }}
          onMouseLeave={closeSubmenu}
        >
          <div className={styles.sectionTitle}>选择歌单</div>
          {candidatePlaylists.length ? candidatePlaylists.map(pl => (
            <button
              key={pl.playlist_id}
              className={styles.item}
              onClick={() => addToTarget(pl.playlist_id)}
            >
              <span className={clsx('fas fa-list', styles.icon)} />
              <span>{pl.title === 'Library' ? '库' : pl.title}</span>
            </button>
          )) : (
            <div className={styles.item} aria-disabled="true">
              <span className={clsx('fas fa-circle-info', styles.icon)} />
              <span>暂无可用歌单</span>
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
}
