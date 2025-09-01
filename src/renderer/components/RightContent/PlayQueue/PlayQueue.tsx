// file: src/renderer/components/RightContent/PlayQueue/PlayQueue.tsx
import React, { useMemo, useState } from 'react';
import styles from './PlayQueue.module.css';
import { DefaultCover } from '@components/static';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import clsx from 'clsx';

interface PlayQueueProps {
  currentTrack: TrackEntity | null;
  nextTracks: TrackEntity[];
  clearQueue: () => void;
  addToNextAndPlay: (track: TrackEntity) => void;
  historyTracks?: TrackEntity[];
  clearHistory?: () => void;
}

export default function PlayQueue({
  currentTrack,
  nextTracks = [],
  clearQueue,
  addToNextAndPlay,
  historyTracks = [],
  clearHistory,
}: PlayQueueProps) {
  const [tab, setTab] = useState<'queue' | 'recent'>('queue');
  const isQueueTab = tab === 'queue';
  const isEmptyQueue = !currentTrack && nextTracks.length === 0;
  const isEmptyRecent = (historyTracks?.length || 0) === 0;
  const isEmpty = isQueueTab ? isEmptyQueue : isEmptyRecent;

  const recentList = useMemo(() => historyTracks || [], [historyTracks]);

  return (
    <section className={styles.root}>
      {/* 头部 */}
      <header className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={clsx(styles.tab, isQueueTab && styles.tabActive)}
            aria-current={isQueueTab ? 'page' : undefined}
            onClick={() => setTab('queue')}
          >
            队列
          </button>
          <button
            className={clsx(styles.tab, !isQueueTab && styles.tabActive)}
            aria-current={!isQueueTab ? 'page' : undefined}
            onClick={() => setTab('recent')}
          >
            最近播放
          </button>
        </div>
        <button
          className={styles.iconBtn}
          title={isQueueTab ? '清空队列' : '清空最近播放'}
          onClick={() => (isQueueTab ? clearQueue() : clearHistory?.())}
          aria-label="清空队列"
          disabled={isEmpty}
        >
          <i className="fas fa-trash" />
        </button>
      </header>

      {/* 可滚动主体 */}
      <div className={styles.body}>
        {isEmpty ? (
          <div className={styles.emptyWrap}>
            <div style={{ textAlign: 'center' }}>
              <i className={clsx('fas fa-music', styles.emptyIcon)} />
              <p className={styles.emptyText}>{isQueueTab ? '暂无播放队列' : '暂无最近播放'}</p>
            </div>
          </div>
        ) : (
          <>
            {isQueueTab ? (
              <>
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
                    <div className={styles.empty}>
                      <i className={clsx('fas fa-music', styles.emptyIcon)} />
                      <div className={styles.emptyText}>暂无播放曲目</div>
                    </div>
                  )}
                </div>

                {/* 接下来 */}
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>接下来</div>
                  {nextTracks.length === 0 ? (
                    <div className={styles.empty}>
                      <i className={clsx('fas fa-music', styles.emptyIcon)} />
                      <div className={styles.emptyText}>队列为空</div>
                    </div>
                  ) : (
                    <div className={styles.list}>
                      {nextTracks.map((track, idx) => (
                        <div
                          key={`${track.platform_unique_id || track.title || 't'}-${idx}`}
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
              </>
            ) : (
              <>
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>最近播放</div>
                  {recentList.length === 0 ? (
                    <div className={styles.empty}>
                      <i className={clsx('fas fa-music', styles.emptyIcon)} />
                      <div className={styles.emptyText}>暂无最近播放</div>
                    </div>
                  ) : (
                    <div className={styles.list}>
                      {recentList.map((track, idx) => (
                        <div
                          key={`recent-${track.platform_unique_id || track.title || 't'}-${idx}`}
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
                            <i className={clsx(styles.rowIcon, 'fas fa-play')} title="再次播放" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
