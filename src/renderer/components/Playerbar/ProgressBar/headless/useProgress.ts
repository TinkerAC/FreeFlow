import { useCallback, useMemo } from 'react';

export interface UseProgressOptions {
  value: number;
  max: number;
  min?: number;
  onChange: (next: number) => void;
  /** 键盘微调步长（秒） */
  step?: number;
  /** 键盘大步长（秒），用于 PageUp/PageDown 或 Shift+Arrow */
  bigStep?: number;
}

export function useProgress({ value, min = 0, max, onChange, step = 1, bigStep = 10 }: UseProgressOptions) {
  const range = Math.max(0, max - min) || 1;
  const clamp = useCallback((v: number) => Math.min(Math.max(v, min), max), [min, max]);
  const toPct = useCallback((v: number) => {
    const c = clamp(v);
    return Math.min(Math.max((c - min) / range, 0), 1);
  }, [clamp, min, range]);
  const pct = useMemo(() => {
    if (!Number.isFinite(value)) return 0;
    return toPct(value);
  }, [value, toPct]);

  const setByPct = useCallback((p: number) => {
    const clampedP = Math.min(Math.max(p, 0), 1);
    onChange(clamp(min + clampedP * range));
  }, [clamp, min, range, onChange]);

  const adjust = useCallback((delta: number) => {
    onChange(clamp(value + delta));
  }, [value, onChange, clamp]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    const accel = e.shiftKey ? bigStep : step;
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        adjust(-accel);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        adjust(accel);
        break;
      case 'PageDown':
        e.preventDefault();
        adjust(-bigStep);
        break;
      case 'PageUp':
        e.preventDefault();
        adjust(bigStep);
        break;
      case 'Home':
        e.preventDefault();
        onChange(min);
        break;
      case 'End':
        e.preventDefault();
        onChange(max);
        break;
      default:
        break;
    }
  }, [adjust, bigStep, min, max, onChange, step]);

  const aria = useMemo(() => ({
    role: 'slider',
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': value,
  }), [min, max, value]);

  return { pct, setByPct, onKeyDown, aria, clamp, toPct };
}
