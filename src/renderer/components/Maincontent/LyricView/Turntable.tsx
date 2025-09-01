import React from 'react';
import styles from './Turntable.module.css';
import { useSetting } from '@renderer/core/config/SettingsContext';

export type TurntableProps = {
  coverSrc: string;
  isPlaying: boolean;
  onCoverError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

const Turntable: React.FC<TurntableProps> = ({ coverSrc, isPlaying, onCoverError }) => {
  // 读取配置：转速（rad/s）。period = 2π / ω
  // 读取唱机设置（UI 域）
  const { value: speedMode } = useSetting<'preset'|'custom'>('ui.turntable.speedMode', 'preset');
  const { value: preset } = useSetting<'slow'|'medium'|'fast'>('ui.turntable.preset', 'medium');
  const { value: customW } = useSetting<number>('ui.turntable.customAngularVelocityRadPerSec', 0.4488);

  const omega = (() => {
    if (speedMode === 'custom') return customW;
    // 预设映射（rad/s）——慢/中/快
    const map: Record<string, number> = { slow: 0.35, medium: 0.4488, fast: 0.7 };
    return map[preset] ?? 0.4488;
  })();

  const periodSec = (() => {
    const w = Math.max(0.01, Number(omega) || 0.4488);
    const t = (2 * Math.PI) / w;
    return Math.max(0.2, Math.min(60, t));
  })();
  return (
    <div className={`${styles.deck} ${isPlaying ? styles.isPlaying : ''}`} style={{ ['--disc-rotate-period' as any]: `${periodSec}s` }}>
      <div className={styles.turntable}>
        {/* 静态主轴盖：不随唱片旋转 */}
        <div className={styles.spindleStatic} />
        <div className={styles.disc}>
          <img
            className={styles.label}
            src={coverSrc}
            onError={onCoverError}
            alt="cover label"
          />
          {/* 中心小圆 spindle 已移除 */}
        </div>
      </div>
      {/* 枢轴底座 + 枢纽帽（静态，不随唱臂旋转） */}
      <div className={styles.pivotBaseStatic}>
        <div className={styles.pivot} />
      </div>
      <div className={styles.tonearm}>
        <div className={styles.armBar} />
        <div className={styles.headshell} />
      </div>
    </div>
  );
};

export default Turntable;
