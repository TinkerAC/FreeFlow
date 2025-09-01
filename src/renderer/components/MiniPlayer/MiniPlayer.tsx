import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MiniPlayer.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { DefaultCover } from '@components/static';
import { formatTime } from '@src/utils/timeUtils';
import { lyricsContext } from '@renderer/core/electronContextApi';
import type { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import '@fortawesome/fontawesome-free/css/all.min.css';
import type { PlayerState } from '@src/shared/domainModel/playerState';

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
    track: null as TrackEntity | null,
  });
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const lyricRef = useRef<HTMLDivElement>(null);
  // 本地插值：基于最近一次权威时间锚点进行平滑推进
  const [displayTime, setDisplayTime] = useState(0);
  const anchorTimeRef = useRef(0); // 秒
  const anchorTsRef = useRef(0);   // performance.now()
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const off = window.mainApi.playerApi.onStateUpdate((st: PlayerState) => {
      const ci = st?.queue?.currentIndex ?? 0;
      const libIdx = st?.queue?.indexList?.[ci] ?? 0;
      const cur = st?.queue?.queue?.[libIdx];
      setState({
        title: cur?.title || '未播放',
        artist: cur?.artist || '',
        cover: cur?.cover_src || DefaultCover,
        currentTime: st?.currentTime || 0,
        duration: cur?.duration || 0,
        isPlaying: !!st?.isPlaying,
        track: cur || null,
      });
      // 更新插值锚点并立即对齐显示
      const ct = st?.currentTime || 0;
      anchorTimeRef.current = ct;
      anchorTsRef.current = performance.now();
      setDisplayTime(ct);
    });
    window.mainApi.playerApi.requestLiveState();
    return () => { off?.(); };
  }, []);

  // 本地插值推进：播放时用 RAF 线性推进，避免仅靠拉取造成的停顿
  useEffect(() => {
    const loop = () => {
      const now = performance.now();
      const elapsed = Math.max(0, (now - anchorTsRef.current) / 1000);
      const dur = state.duration || Infinity;
      const next = Math.min(dur, anchorTimeRef.current + elapsed);
      setDisplayTime(next);
      rafIdRef.current = requestAnimationFrame(loop);
    };
    if (state.isPlaying) {
      anchorTimeRef.current = state.currentTime || anchorTimeRef.current;
      anchorTsRef.current = performance.now();
      rafIdRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    };
  }, [state.isPlaying, state.duration, state.currentTime]);

  // 关键时刻拉取：窗口聚焦/可见切回时，主动请求一次最新状态
  useEffect(() => {
    const onFocus = () => { try { window.mainApi.playerApi.requestLiveState(); } catch {} };
    const onVis = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // 控制后“脉冲式拉取”：立刻 + 150ms + 800ms，对齐封面/时长/进度
  const pulsePull = () => {
    try { window.mainApi.playerApi.requestLiveState(); } catch {}
    setTimeout(() => { try { window.mainApi.playerApi.requestLiveState(); } catch {} }, 150);
    setTimeout(() => { try { window.mainApi.playerApi.requestLiveState(); } catch {} }, 800);
  };

  // 加载歌词（展开时或曲目变化时）
  useEffect(() => {
    const t = state.track;
    if (!showLyrics || !t) { setLyric(null); return; }
    let alive = true;
    lyricsContext.getLyrics(t)
      .then((l) => { if (alive) setLyric(l || null); })
      .catch(() => setLyric(null));
    return () => { alive = false; };
  }, [showLyrics, state.track?.platform, state.track?.platform_unique_id]);

  const pct = useMemo(() => {
    const d = state.duration || 1;
    return Math.min(1, Math.max(0, displayTime / d));
  }, [displayTime, state.duration]);

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
            onClick={() => { window.mainApi.playerApi.control('prev'); pulsePull(); }}
            title='上一首'
          >
            <i className='fas fa-step-backward' />
          </button>
          <button
            className={styles.icon}
            onClick={() => { window.mainApi.playerApi.control('toggle'); pulsePull(); }}
            title={state.isPlaying ? '暂停' : '播放'}
          >
            <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'}`} />
          </button>
          <button
            className={styles.icon}
            onClick={() => { window.mainApi.playerApi.control('next'); pulsePull(); }}
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
            {formatTime(displayTime)} / {formatTime(state.duration)}
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
