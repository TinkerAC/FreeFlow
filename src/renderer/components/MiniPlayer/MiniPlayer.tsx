import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MiniPlayer.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { DefaultCover } from '@components/static';
import { formatTime } from '@src/utils/timeUtils';
import { lyricsContext } from '@renderer/core/electronContextApi';
import type { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function MiniPlayer({
  player,
}: {
  player: PlayerController | null;
}) {
  const [state, setState] = useState({
    title: '未播放',
    artist: '',
    cover: DefaultCover,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  });
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const lyricRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!player) return;
    const sync = () => {
      const t = player.playQueue.currentTrack;
      setState({
        title: t?.title || '未播放',
        artist: t?.artist || '',
        cover: t?.cover_src || DefaultCover,
        currentTime: player.currentTime || 0,
        duration: t?.duration || 0,
        isPlaying: player.isPlaying,
      });
    };
    sync();
    const unsub = player.subscribe(sync);
    return () => {
      unsub();
    };
  }, [player]);

  // 加载歌词（展开时或曲目变化时）
  useEffect(() => {
    const t = player?.playQueue.currentTrack;
    if (!showLyrics || !t) { setLyric(null); return; }
    let alive = true;
    lyricsContext.getLyrics(t)
      .then((l) => { if (alive) setLyric(l || null); })
      .catch(() => setLyric(null));
    return () => { alive = false; };
  }, [showLyrics, player?.playQueue.currentTrack?.platform, player?.playQueue.currentTrack?.platform_unique_id]);

  const pct = useMemo(() => {
    const d = state.duration || 1;
    return Math.min(1, Math.max(0, state.currentTime / d));
  }, [state.currentTime, state.duration]);

  // 当前歌词行（基于 originLines）
  const currentLine = useMemo<LyricLine | null>(() => {
    if (!lyric?.originLines?.length) return null;
    const tMs = (state.currentTime || 0) * 1000;
    let lo = 0, hi = lyric.originLines.length - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lyric.originLines[mid].time <= tMs) { ans = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    return ans >= 0 ? lyric.originLines[ans] : null;
  }, [lyric, state.currentTime]);

  // 保持当前行在可视区域
  useEffect(() => {
    if (!showLyrics) return;
    const host = lyricRef.current;
    if (!host) return;
    const active = host.querySelector(`.${styles.lyricActive}`) as HTMLElement | null;
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [showLyrics, currentLine?.time]);

  return (
    <div className={styles.root}>
      {/* 顶部可拖动区域 */}
      <div className={styles.topbar}>
        <div className={styles.title} title={state.title}>
          {state.title}
        </div>
        <div className={styles.actions}>
          <button
            className={styles.icon}
            onClick={() => player?.playPrevious()}
            title='上一首'
          >
            <i className='fas fa-step-backward' />
          </button>
          <button
            className={styles.icon}
            onClick={() => player?.togglePlayPause()}
            title={state.isPlaying ? '暂停' : '播放'}
          >
            <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'}`} />
          </button>
          <button
            className={styles.icon}
            onClick={() => player?.playNext()}
            title='下一首'
          >
            <i className='fas fa-step-forward' />
          </button>
          <button
            className={styles.icon}
            onClick={() => window.mainApi.miniPlayerApi.hide()}
            title='返回主界面'
          >
            <i className='fas fa-window-restore' />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        <img
          className={styles.cover}
          src={state.cover}
          alt='cover'
          referrerPolicy='no-referrer'
        />
        <div className={styles.meta}>
          <div className={styles.artist} title={state.artist}>
            {state.artist}
          </div>
          <div className={styles.times}>
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </div>
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <div className={styles.bar}>
                <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
              </div>
              <button
                className={styles.tinyIcon}
                onClick={async () => {
                  const next = !showLyrics;
                  setShowLyrics(next);
                  try { await window.mainApi.miniPlayerApi.setExpanded(next); } catch {}
                }}
                title={showLyrics ? '收起歌词' : '展开歌词'}
                aria-pressed={showLyrics}
              >
                <i className={`fas ${showLyrics ? 'fa-chevron-down' : 'fa-align-center'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 歌词区：与播放器区上下并列，不再包裹在 meta 内 */}
      {showLyrics && (
        <div className={styles.lyricSection}>
          <div className={styles.lyricPanel} ref={lyricRef}>
            {(lyric?.originLines ?? []).map((ln, idx) => {
              const active = currentLine && ln.time === currentLine.time;
              return (
                <div key={idx} className={active ? styles.lyricActive : styles.lyricLine}>
                  {ln.text || '...'}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
