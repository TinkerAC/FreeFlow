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
                                                      }) => {
  const { pct, setByPct, onKeyDown, aria } = useProgress({ value, min, max, onChange });
  const pctStr = useMemo(() => `${pct * 100}%`, [pct]);
  const ref = useRef<HTMLDivElement>(null);
  const drag = useSliderDrag(ref, setByPct);
  return (
    <div className={clsx(styles.root, size === 'sm' && styles.size_sm, size === 'lg' && styles.size_lg, className)}
         tabIndex={0} onKeyDown={onKeyDown} {...aria}>
      {showTimes && <span className={clsx(styles.time, classNames?.timeL)}>{formatTime(value)}</span>}
      <div ref={ref} className={clsx(styles.container, classNames?.container)} onPointerDown={drag.onPointerDown}>
        <div className={clsx(styles.fill, classNames?.fill)} style={{ ['--pg-pct' as any]: pctStr }} />
        <div className={clsx(styles.thumb, classNames?.thumb)} style={{ ['--pg-pct' as any]: pctStr }} />
      </div>
      {showTimes && <span className={clsx(styles.time, classNames?.timeR)}>{formatTime(max)}</span>}
    </div>
  );
};

registerProgressSkin('classic', ClassicBar);   // 对应 neon/waveform/knob 同理
