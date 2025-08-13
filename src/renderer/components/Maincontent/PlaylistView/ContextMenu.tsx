import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ContextMenu.module.css';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import clsx from 'clsx';

interface ContextMenuProps {
  x: number;     // 直接传 clientX
  y: number;     // 直接传 clientY
  track: TrackEntity;
  player: PlayerController;
  handleCloseMenu: () => void;
  musicLibraryController: MusicLibraryController;
}

export default function ContextMenu({
                                      x, y, track, handleCloseMenu, player, musicLibraryController,
                                    }: ContextMenuProps) {

  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number }>({ left: x, top: y });
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);

  const playlists = musicLibraryController.playlists ?? [];
  const activeId = musicLibraryController.activePlaylist?.playlist_id;

  // —— 视口防越界：主菜单 —— //
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    let left = x, top = y;

    if (left + rect.width + gap > window.innerWidth) left = Math.max(gap, window.innerWidth - rect.width - gap);
    if (top + rect.height + gap > window.innerHeight) top = Math.max(gap, window.innerHeight - rect.height - gap);
    setMenuPos({ left, top });
  }, [x, y]);

  // —— 点击外部关闭 / Esc 关闭 —— //
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) handleCloseMenu();
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleCloseMenu(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [handleCloseMenu]);

  // —— 子菜单定位（根据主菜单项 hover 时的行 rect + 视口判断左右展开） —— //
  const openSubmenu = (rowEl: HTMLElement) => {
    const r = rowEl.getBoundingClientRect();
    const subW = 240;
    const gap = 6;
    const preferRight = r.right + subW + gap < window.innerWidth;
    const left = preferRight ? r.right + gap : r.left - subW - gap;
    const top = Math.max(8, Math.min(r.top, window.innerHeight - 320 - 8));
    setSubPos({ left, top });
  };

  const closeSubmenu = () => setSubPos(null);

  if (!track) return null;

  const removeFromCurrent = async () => {
    const pid = musicLibraryController.activePlaylist?.playlist_id;
    if (pid === 0) {
      await libraryContext.removeTrackFromLibrary(track);
    } else if (pid != null) {
      await playlistContext.removeTrackFromPlaylist(pid, track);
    }
    musicLibraryController.refreshPlaylists();
    handleCloseMenu();
  };

  const addToTarget = async (playlistId: number) => {
    if (playlistId === 0) {
      await libraryContext.addTrackToLibrary(track);
    } else {
      await playlistContext.addTrackToPlaylist(track, playlistId);
    }
    musicLibraryController.refreshPlaylists();
    handleCloseMenu();
  };

  const candidatePlaylists = useMemo(
    () => playlists.filter(p => p.playlist_id !== activeId),
    [playlists, activeId],
  );

  return (
    <>
      <div
        ref={menuRef}
        className={styles.menu}
        role="menu"
        style={{ left: menuPos.left, top: menuPos.top }}
      >
        {/* 添加到下一首播放 */}
        <button
          className={styles.item}
          role="menuitem"
          onClick={() => { player.addTrackToNext(track); handleCloseMenu(); }}
        >
          <span className={clsx('fas fa-forward', styles.icon)} />
          <span>添加到下一首播放</span>
          <span className={styles.kbd}>Enter</span>
        </button>

        {/* 添加到…（子菜单） */}
        <div
          className={clsx(styles.item, styles.subWrap)}
          role="menuitem"
          onMouseEnter={(e) => openSubmenu(e.currentTarget)}
          onMouseLeave={closeSubmenu}
        >
          <span className={clsx('fas fa-folder-plus', styles.icon)} />
          <span>添加到…</span>
          <span className={clsx('fas fa-chevron-right', styles.subCaret)} />

          {subPos && (
            <div
              className={styles.subMenu}
              style={{ left: subPos.left, top: subPos.top }}
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
        </div>

        <div className={styles.divider} />

        {/* 从当前播放列表中移除 */}
        <button className={styles.item} role="menuitem" onClick={removeFromCurrent}>
          <span className={clsx('fas fa-xmark', styles.icon)} />
          <span>从 {musicLibraryController.activePlaylist?.title ?? '当前'} 中移除</span>
        </button>

        {/* 下载 */}
        <button
          className={styles.item}
          role="menuitem"
          onClick={async () => { await libraryContext.downFromHifini(track); handleCloseMenu(); }}
        >
          <span className={clsx('fas fa-download', styles.icon)} />
          <span>下载</span>
        </button>
      </div>
    </>
  );
}