import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import BaseContextMenu, { BaseContextMenuProps } from './BaseContextMenu';
import styles from './Menu.module.css';
import { createPortal } from 'react-dom';

export interface MenuItem {
  key: string;
  icon?: string; // fontawesome class
  label: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
  submenu?: MenuItem[];
}

export interface ContextMenuProps extends Omit<BaseContextMenuProps, 'children'> {
  items: MenuItem[];
}

export default function ContextMenu({ x, y, onRequestClose, items, className }: ContextMenuProps) {
  const [subPos, setSubPos] = useState<{ left: number; top: number } | null>(null);
  const subMenuTimerRef = useRef<number | null>(null);
  const subOfRef = useRef<HTMLDivElement | null>(null);
  const subMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current); }, []);

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
    subOfRef.current = rowEl as HTMLDivElement;
  };
  const closeSubmenu = () => {
    subMenuTimerRef.current = window.setTimeout(() => setSubPos(null), 150);
  };

  return (
    <>
      <BaseContextMenu x={x} y={y} onRequestClose={onRequestClose} className={clsx(styles.menu, className)} extraOverlayRefs={[subMenuRef]}>
        {items.map((it) => it.submenu ? (
          <div key={it.key} className={clsx(styles.item, styles.subWrap)}
               onMouseEnter={(e) => openSubmenu(e.currentTarget)}
               onMouseLeave={closeSubmenu}
               aria-disabled={it.disabled ? 'true' : undefined}
          >
            {it.icon && <span className={clsx(it.icon, styles.icon)} />}
            <span>{it.label}</span>
            <span className={clsx('fas fa-chevron-right', styles.subCaret)} />
          </div>
        ) : (
          <button key={it.key} className={styles.item} disabled={it.disabled} onClick={() => { it.onClick?.(); onRequestClose(); }}>
            {it.icon && <span className={clsx(it.icon, styles.icon)} />}
            <span>{it.label}</span>
          </button>
        ))}
      </BaseContextMenu>

      {subPos && createPortal(
        <div ref={subMenuRef} className={styles.subMenu} style={{ left: subPos.left, top: subPos.top }}
             onMouseEnter={() => { if (subMenuTimerRef.current) clearTimeout(subMenuTimerRef.current); }}
             onMouseLeave={closeSubmenu}
        >
          {(items.find(i => i.submenu && subOfRef.current?.textContent?.includes(String(i.label)))?.submenu ?? []).map((si) => (
            <button key={si.key} className={styles.item} disabled={si.disabled} onClick={() => { si.onClick?.(); onRequestClose(); }}>
              {si.icon && <span className={clsx(si.icon, styles.icon)} />}
              <span>{si.label}</span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
