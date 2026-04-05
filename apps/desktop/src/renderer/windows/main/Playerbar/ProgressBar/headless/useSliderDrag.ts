import { useCallback } from 'react';

export function useSliderDrag(ref: React.RefObject<HTMLElement>, setByPct: (p: number) => void) {
  const getPctFromEvent = useCallback((ev: PointerEvent | React.PointerEvent) => {
    const el = ref.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = 'clientX' in ev ? ev.clientX : (ev as any).nativeEvent.clientX;
    const p = (x - rect.left) / rect.width;
    return Math.min(Math.max(p, 0), 1);
  }, [ref]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setByPct(getPctFromEvent(e));

    const move = (ev: PointerEvent) => setByPct(getPctFromEvent(ev));
    const up = (ev: PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [getPctFromEvent, ref, setByPct]);

  return { onPointerDown } as const;
}