import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface BaseContextMenuProps {
  x: number;
  y: number;
  onRequestClose: () => void;
  className?: string;
  role?: string;
  children: React.ReactNode;
  /**
   * Additional overlay element refs that should be considered as part of the menu overlay.
   * Clicks inside any of these will NOT close the menu.
   */
  extraOverlayRefs?: Array<React.RefObject<HTMLElement>>;
}

export default function BaseContextMenu({
                                          x,
                                          y,
                                          onRequestClose,
                                          className,
                                          role = 'menu',
                                          children,
                                          extraOverlayRefs,
                                        }: BaseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const gap = 8;
    let left = x;
    let top = y;

    if (left + rect.width + gap > window.innerWidth) {
      left = window.innerWidth - rect.width - gap;
    }
    if (top + rect.height + gap > window.innerHeight) {
      top = window.innerHeight - rect.height - gap;
    }

    left = Math.max(gap, left);
    top = Math.max(gap, top);

    setMenuStyle({ left, top, opacity: 1, transition: 'opacity .1s ease-in-out', position: 'fixed', zIndex: 10000 });
  }, [x, y]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inMain = !!menuRef.current?.contains(target);
      const inExtra = (extraOverlayRefs ?? []).some(r => !!r.current?.contains(target as Node));
      if (!inMain && !inExtra) onRequestClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [onRequestClose, extraOverlayRefs]);

  return createPortal(
    <div ref={menuRef} className={className} role={role} style={menuStyle} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>,
    document.body,
  );
}
