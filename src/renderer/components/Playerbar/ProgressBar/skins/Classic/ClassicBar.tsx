import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useProgress } from '../../headless/useProgress';
import { useSliderDrag } from '../../headless/useSliderDrag';
import { formatTime } from '@src/utils/timeUtils';
import styles from './ClassicBar.module.css';
import { registerProgressSkin } from '../../ProgressSkinRegistry';

export interface ClassicBarProps {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  showTimes?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  classNames?: { container?: string; fill?: string; thumb?: string; timeL?: string; timeR?: string; };
  /** 缓冲片段（单位：秒，基于同一 min/max 坐标系） */
  buffered?: Array<{ start: number; end: number }>;
}

export const ClassicBar: React.FC<ClassicBarProps> = ({
                                                        value,
                                                        min = 0,
                                                        max,
                                                        onChange,
                                                        showTimes = true,
                                                        size = 'md',
                                                        className,
                                                        classNames,
                                                        buffered,
                                                      }) => {
  const { pct, setByPct, onKeyDown, aria, toPct } = useProgress({ value, min, max, onChange });
  const pctStr = useMemo(() => `${pct * 100}%`, [pct]);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useSliderDrag(ref, setByPct);
  const bufferedRects = useMemo(() => {
    if (!buffered || !buffered.length) return [] as Array<{ leftPct: string; widthPct: string }>;
    return buffered
      .map(r => {
        const startP = toPct(r.start);
        const endP = toPct(r.end);
        const left = Math.max(0, Math.min(1, startP));
        const right = Math.max(0, Math.min(1, endP));
        const width = Math.max(0, right - left);
        return { leftPct: `${left * 100}%`, widthPct: `${width * 100}%` };
      })
      .filter(r => r.widthPct !== '0%');
  }, [buffered, toPct]);
  return (
    <div className={clsx(styles.root, size === 'sm' && styles.size_sm, size === 'lg' && styles.size_lg, className)}
         tabIndex={0} onKeyDown={onKeyDown} {...aria}>
      {showTimes && <span className={clsx(styles.time, classNames?.timeL)}>{formatTime(value)}</span>}
      <div ref={ref} className={clsx(styles.container, classNames?.container)} onPointerDown={drag.onPointerDown}>
        {/* buffered 背景条（可能多段） */}
        <div className={styles.buffers} aria-hidden>
          {bufferedRects.map((r, i) => (
            <div key={i} className={styles.buffer} style={{ left: r.leftPct, width: r.widthPct }} />
          ))}
        </div>
        <div className={clsx(styles.fill, classNames?.fill)} style={{ ['--pg-pct' as any]: pctStr }} />
        <div className={clsx(styles.thumb, classNames?.thumb)} style={{ ['--pg-pct' as any]: pctStr }} />
      </div>
      {showTimes && <span className={clsx(styles.time, classNames?.timeR)}>{formatTime(max)}</span>}
    </div>
  );
};

registerProgressSkin('classic', ClassicBar);   // 对应 neon/waveform/knob 同理
