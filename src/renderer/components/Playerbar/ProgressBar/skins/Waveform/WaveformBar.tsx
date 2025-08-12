import React, { useMemo, useRef } from 'react';
import clsx from 'clsx';
import { useProgress } from '../../headless/useProgress';
import { useSliderDrag } from '../../headless/useSliderDrag';
import { formatTime } from '@src/utils/timeUtils';
import styles from './WaveformBar.module.css';
import { registerProgressSkin } from '@components/Playerbar/ProgressBar/ProgressSkinRegistry';

function heights(count = 64) {
  // 预生成一些伪随机高度（0.3 ~ 1），可替换为真实峰值数据
  const arr = Array.from({ length: count }, (_, i) => 0.3 + 0.1 * (Math.sin(i * 0.37) * 0.5 + 0.5));
  return arr;
}

export interface WaveformBarProps {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  showTimes?: boolean;
  bars?: number;
  className?: string;
}

export const WaveformBar: React.FC<WaveformBarProps> = ({
                                                          value,
                                                          min = 0,
                                                          max,
                                                          onChange,
                                                          showTimes = true,
                                                          bars = 64,
                                                          className,
                                                        }) => {
  const { pct, setByPct, onKeyDown, aria } = useProgress({ value, min, max, onChange });
  const ref = useRef<HTMLDivElement>(null);
  const drag = useSliderDrag(ref, setByPct);
  const pts = useMemo(() => heights(bars), [bars]);
  const activeIdx = Math.round(pct * (bars - 1));

  return (
    <div className={clsx(styles.root, className)} tabIndex={0} onKeyDown={onKeyDown} {...aria}>
      {showTimes && <span className={styles.time}>{formatTime(value)}</span>}
      <div ref={ref} className={styles.wrap} onPointerDown={drag.onPointerDown}>
        {pts.map((h, i) => (
          <div key={i} className={clsx(styles.bar, i <= activeIdx && styles.barActive)}
               style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      {showTimes && <span className={styles.time}>{formatTime(max)}</span>}
    </div>
  );
};

registerProgressSkin('waveform', WaveformBar); // 注册 WaveformBar 皮肤
