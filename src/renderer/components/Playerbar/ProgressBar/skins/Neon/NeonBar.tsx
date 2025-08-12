import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useProgress } from '../../headless/useProgress';
import { useSliderDrag } from '../../headless/useSliderDrag';
import { formatTime } from '@src/utils/timeUtils';
import styles from './NeonBar.module.css';
import { registerProgressSkin } from '@components/Playerbar/ProgressBar/ProgressSkinRegistry';

export interface NeonBarProps { value: number; min?: number; max: number; onChange: (v:number)=>void; showTimes?: boolean; className?: string; }

export const NeonBar: React.FC<NeonBarProps> = ({ value, min = 0, max, onChange, showTimes = true, className }) => {
  const { pct, setByPct, onKeyDown, aria } = useProgress({ value, min, max, onChange });
  const pctStr = useMemo(() => `${pct * 100}%`, [pct]);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useSliderDrag(ref, setByPct);

  return (
    <div className={clsx(styles.root, className)} tabIndex={0} onKeyDown={onKeyDown} {...aria}>
      {showTimes && <span className={styles.time}>{formatTime(value)}</span>}
      <div ref={ref} className={styles.container} onPointerDown={drag.onPointerDown}>
        <div className={styles.indicator} style={{ ['--pg-pct' as any]: pctStr }} />
        <div className={styles.shimmer} />
        <div className={styles.thumb} style={{ ['--pg-pct' as any]: pctStr }} />
      </div>
      {showTimes && <span className={styles.time}>{formatTime(max)}</span>}
    </div>
  );
};
registerProgressSkin('neon', NeonBar); // 注册 NeonBar 皮肤
