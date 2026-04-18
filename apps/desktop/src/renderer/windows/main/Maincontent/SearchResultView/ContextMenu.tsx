// file: src/renderer/components/Maincontent/SearchResultView/ContextMenu.tsx

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import styles from './ContextMenu.module.css'; // 将使用下方新的 CSS 文件
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { Platform } from '@main/core/enum/Platform';

// Props 定义保持不变
interface ContextMenuProps {
  x: number;
  y: number;
  track: TrackEntity;
  handleCloseMenu: () => void;
  addTrackToPlaylist: (t: TrackEntity, id: number) => void;
  playlists: PlaylistEntity[];
  player: PlayerController;
  onDetailRequest?: (track: TrackEntity) => void;
}

export default function ContextMenu({
                                      x, y, track, handleCloseMenu, addTrackToPlaylist, playlists, player, onDetailRequest,
                                    }: ContextMenuProps) {

  // ✅ 统一使用健壮的 Refs 和 State 结构
  const menuRef = useRef<HTMLDivElement>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);
  const subMenuTimerRef = useRef<number | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);

  // ✅ 使用 useLayoutEffect 动态计算位置，避免闪烁和尺寸错误
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    let finalLeft = x, finalTop = y;

    if (finalLeft + rect.width + gap > window.innerWidth) finalLeft = window.innerWidth - rect.width - gap;
    if (finalTop + rect.height + gap > window.innerHeight) finalTop = window.innerHeight - rect.height - gap;
    finalLeft = Math.max(gap, finalLeft);
    finalTop = Math.max(gap, finalTop);

    setMenuStyle({ left: finalLeft, top: finalTop, opacity: 1, transition: 'opacity .1s ease-in-out' });
  }, [x, y]);

  // ✅ 添加完整的外部点击和 Esc 关闭事件处理
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

  // ✅ 统一使用带计时器的子菜单打开/关闭逻辑
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

  const handleAddToPlaylist = (p: PlaylistEntity) => {
    if (track.platform === Platform.FREEFLOW) {
      handleCloseMenu();
      return;
    }

    if (p.playlist_id) addTrackToPlaylist(track, p.playlist_id);
    handleCloseMenu();
  };

  if (!track) return null;

  // ✅ 统一使用 Portal 包裹主菜单和子菜单作为兄弟节点
  return createPortal(
    <>
      <div ref={menuRef} className={styles.menu} style={menuStyle}>
        <button
          className={styles.item}
          onClick={() => {
            player.addTrackToNext(track);
            handleCloseMenu();
          }}
        >
          <span className={clsx('fas fa-forward', styles.icon)} />
          <span>添加到下一首播放</span>
        </button>

        {track.platform === Platform.FREEFLOW && (
          <button
            className={styles.item}
            onClick={() => {
              onDetailRequest?.(track);
              handleCloseMenu();
            }}
          >
            <span className={clsx('fas fa-circle-info', styles.icon)} />
            <span>查看链上详情</span>
          </button>
        )}

        {track.platform !== Platform.FREEFLOW && <div className={styles.divider} />}

        {track.platform !== Platform.FREEFLOW && (
          <div
            className={clsx(styles.item, styles.subWrap)}
            onMouseEnter={(e) => openSubmenu(e.currentTarget)}
            onMouseLeave={closeSubmenu}
          >
            <span className={clsx('fas fa-folder-plus', styles.icon)} />
            <span>添加到…</span>
            <span className={clsx('fas fa-chevron-right', styles.subCaret)} />
          </div>
        )}
      </div>

      {track.platform !== Platform.FREEFLOW && subPos && (
        <div
          ref={subMenuRef}
          className={styles.subMenu}
          style={{ left: subPos.left, top: subPos.top }}
          onMouseEnter={() => {
            if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current);
          }}
          onMouseLeave={closeSubmenu}
        >
          <div className={styles.sectionTitle}>选择歌单</div>
          {playlists.map((p) => (
            <button key={p.playlist_id} className={styles.item} onClick={() => handleAddToPlaylist(p)}>
              <span className={clsx('fas fa-list', styles.icon)} />
              <span>{p.title === 'Library' ? '库' : p.title}</span>
            </button>
          ))}
        </div>
      )}
    </>,
    document.body,
  );
}
