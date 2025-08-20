import React from 'react';
import styles from './Turntable.module.css';

export type TurntableProps = {
  coverSrc: string;
  isPlaying: boolean;
  onCoverError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
};

const Turntable: React.FC<TurntableProps> = ({ coverSrc, isPlaying, onCoverError }) => {
  return (
    <div className={`${styles.deck} ${isPlaying ? styles.isPlaying : ''}`}>
      <div className={styles.turntable}>
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
      <div className={styles.tonearm}>
        <div className={styles.armBar} />
        <div className={styles.headshell} />
        {/* 枢轴底座 + 枢纽帽 */}
        <div className={styles.pivotBase}>
          <div className={styles.pivot} />
        </div>
      </div>
    </div>
  );
};

export default Turntable;
