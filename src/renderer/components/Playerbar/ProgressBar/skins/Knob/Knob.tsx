import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useProgress } from '../../headless/useProgress';
import { formatTime } from '@src/utils/timeUtils';
import styles from './Knob.module.css';
import { registerProgressSkin } from '@components/Playerbar/ProgressBar/ProgressSkinRegistry';

export interface KnobProps {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  showTimes?: boolean;
  className?: string;
}

export const Knob: React.FC<KnobProps> = ({ value, min = 0, max, onChange, showTimes = true, className }) => {
  const { pct, setByPct, onKeyDown, aria } = useProgress({ value, min, max, onChange });
  const ref = useRef<SVGSVGElement>(null);
  const size = 72;
  const r = 28;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const dash = useMemo(() => ({ array: C, offset: (1 - pct) * C }), [C, pct]);

  const toPctFromClient = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return pct;
    const rect = el.getBoundingClientRect();
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    let angle = Math.atan2(y, x); // [-PI, PI], 0 在右侧
    // 转成[0,1]，让顶部(-90deg)为0，顺时针增加
    angle = angle + Math.PI / 2; // 顶部为 0
    if (angle < 0) angle += Math.PI * 2;
    const p = angle / (Math.PI * 2);
    return Math.min(Math.max(p, 0), 1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setByPct(toPctFromClient(e.clientX, e.clientY));
    const move = (ev: PointerEvent) => setByPct(toPctFromClient(ev.clientX, ev.clientY));
    const up = (ev: PointerEvent) => {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  // thumb 坐标
  const theta = -Math.PI / 2 + pct * Math.PI * 2; // 顶部起点
  const tx = cx + r * Math.cos(theta);
  const ty = cy + r * Math.sin(theta);

  return (
    <div className={clsx(styles.root, className)} tabIndex={0} onKeyDown={onKeyDown} {...aria}>
      <svg ref={ref} className={styles.svg} viewBox={`0 0 ${size} ${size}`} onPointerDown={onPointerDown}>
        <circle className={styles.track} cx={cx} cy={cy} r={r} />
        <circle className={styles.indicator} cx={cx} cy={cy} r={r} strokeDasharray={dash.array}
                strokeDashoffset={dash.offset} />
        <circle className={styles.thumb} cx={tx} cy={ty} r={4} />
      </svg>
      {showTimes && (
        <div className={styles.label}>{formatTime(value)} / {formatTime(max)}</div>
      )}
    </div>
  );
};

registerProgressSkin('knob', Knob);
