import React from 'react';
import styles from './PlayQueue.module.css';
import { DefaultCover } from '@components/static';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import clsx from 'clsx';

interface PlayQueueProps {
  currentTrack: TrackEntity | null;
  nextTracks: TrackEntity[];
  clearQueue: () => void;
  addToNextAndPlay: (track: TrackEntity) => void;
}

export default function PlayQueue({
                                    currentTrack,
                                    nextTracks = [],
                                    clearQueue,
                                    addToNextAndPlay,
                                  }: PlayQueueProps) {
  return (
    <section className={styles.root}>
      {/* 头部：标签切换 + 操作 */}
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button className={clsx(styles.tab, styles.tabActive)} aria-current="page">队列</button>
          <button className={styles.tab} disabled>最近播放</button>
        </div>
        <button className={styles.iconBtn} title="清空队列" onClick={clearQueue} aria-label="清空队列">
          <i className="fas fa-trash" />
        </button>
      </header>

      {/* 当前播放 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>当前播放</div>
        {currentTrack && currentTrack.title ? (
          <div className={clsx(styles.row, styles.nowRow)}>
            <img
              src={currentTrack.cover_src || DefaultCover}
              alt={`Album cover of ${currentTrack.title || 'unknown'}`}
              className={styles.cover}
            />
            <div className={styles.meta}>
              <div className={styles.title} title={currentTrack.title}>{currentTrack.title}</div>
              <div className={styles.artist} title={currentTrack.artist || ''}>
                {currentTrack.artist || 'unknown artist'}
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>暂无播放曲目</div>
        )}
      </div>

      {/* 下一首列表 */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>接下来</div>
        {nextTracks.length === 0 ? (
          <div className={styles.empty}>队列为空</div>
        ) : (
          <div className={styles.list}>
            {nextTracks.map((track, idx) => (
              <div
                key={`${track.platform_unique_id || track.title}-${idx}`}
                className={styles.row}
                onDoubleClick={() => addToNextAndPlay(track)}
                title={track?.title || 'unknown title'}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addToNextAndPlay(track);
                  }
                }}
                aria-label={`播放 ${track?.title || '未知歌曲'}`}
              >
                <img
                  src={track.cover_src || DefaultCover}
                  alt={`Album cover of ${track?.title || 'unknown'}`}
                  className={styles.cover}
                />
                <div className={styles.meta}>
                  <div className={styles.title}>{track?.title || 'unknown title'}</div>
                  <div className={styles.artist}>{track?.artist || 'unknown artist'}</div>
                </div>
                <div className={styles.rowActions}>
                  <i className={clsx(styles.rowIcon, 'fas fa-play')} title="立即播放" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}