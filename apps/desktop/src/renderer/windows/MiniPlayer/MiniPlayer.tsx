import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './MiniPlayer.module.css';
import PlayerController from '@renderer/core/controller/PlayerController';
import { DefaultCover } from '@components/static';
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
  // 记录已在“本地进度结束”触发过拉取的曲目，避免连续触发
  const endPullKeyRef = useRef<string | null>(null);
  // 记录最近一次曲目 key，用于判定是否切歌（切歌时允许时间回退到 0）
  const lastTrackKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const off = window.mainApi.playerApi.onStateUpdate((st: PlayerState) => {
      const ci = st?.queue?.currentIndex ?? 0;
      const libIdx = st?.queue?.indexList?.[ci] ?? 0;
      const cur = st?.queue?.queue?.[libIdx];

      // 判定曲目 key
      const key = cur ? `${cur.platform}:${cur.platform_unique_id}` : '__no_track__';
      const changed = key !== lastTrackKeyRef.current;

      // 计算基于当前锚点的本地预测时间
      const now = performance.now();
      const projected = anchorTimeRef.current + Math.max(0, (now - anchorTsRef.current) / 1000);
      const incoming = st?.currentTime || 0;
      const tolerance = 0.35; // 允许的抖动

      // 若非切歌且后到的状态让时间大幅回退，则进行夹持，避免 1 -> 0 -> 继续 的跳变
      const appliedCt = (!changed && incoming + tolerance < projected) ? projected : incoming;

      setState({
        title: cur?.title || '未播放',
        artist: cur?.artist || '',
        cover: cur?.cover_src || DefaultCover,
        currentTime: appliedCt,
        duration: cur?.duration || 0,
        isPlaying: !!st?.isPlaying,
        track: cur || null,
      });

      // 更新插值锚点并立即对齐显示（对齐到 appliedCt）
      anchorTimeRef.current = appliedCt;
      anchorTsRef.current = now;
      setDisplayTime(appliedCt);
      lastTrackKeyRef.current = key;
    });
    // 仅依赖广播，不再主动请求状态
    return () => {
      off?.();
    };
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


  // 曲目变化时，重置“结束触发过拉取”标记
  useEffect(() => {
    const t = state.track;
    if (t) {
      endPullKeyRef.current = null;
    }
  }, [state.track?.platform, state.track?.platform_unique_id]);

  // 当本地进度条“走到头”时，补一次状态更新（对齐主播放状态/切歌）
  useEffect(() => {
    // 不再在进度接近末尾时触发状态补拉
  }, [displayTime, state.duration, state.isPlaying, state.track?.platform, state.track?.platform_unique_id]);

  // 加载歌词（展开时或曲目变化时）
  useEffect(() => {
    const t = state.track;
    if (!showLyrics || !t) {
      setLyric(null);
      return;
    }
    let alive = true;
    lyricsContext.getLyrics(t)
      .then((l) => {
        if (alive) setLyric(l || null);
      })
      .catch(() => setLyric(null));
    return () => {
      alive = false;
    };
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
      if (lyric.originLines[mid].time <= tMs) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
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
      <div className={styles.body}>
        <div className={styles.coverWrap}>
          <img
            className={styles.cover}
            src={state.cover}
            alt="cover"
            referrerPolicy="no-referrer"
          />
          <div className={styles.controlsOverlay}>
            <button
              className={styles.icon}
              onClick={() => {
                window.mainApi.playerApi.control('prev');
              }}
              title="上一首"
            >
              <i className="fas fa-step-backward" />
            </button>
            <button
              className={styles.icon}
              onClick={() => {
                window.mainApi.playerApi.control('toggle');
              }}
              title={state.isPlaying ? '暂停' : '播放'}
            >
              <i className={`fas ${state.isPlaying ? 'fa-pause' : 'fa-play'}`} />
            </button>
            <button
              className={styles.icon}
              onClick={() => {
                window.mainApi.playerApi.control('next');
              }}
              title="下一首"
            >
              <i className="fas fa-step-forward" />
            </button>
          </div>
        </div>
        <div className={styles.meta}>
          <div className={styles.title} title={state.title}>{state.title}</div>
          <div className={styles.artist} title={state.artist}>{state.artist}</div>
          <div className={styles.progress}>
            <div className={styles.progressRow}>
              <div className={styles.bar}>
                <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
        <div className={styles.side}>
          <button
            className={styles.sideBtn}
            onClick={() => window.mainApi.miniPlayerApi.hide()}
            title="返回主界面"
          >
            <i className="fas fa-window-restore" />
          </button>
          <button
            className={styles.sideBtn}
            onClick={async () => {
              const next = !showLyrics;
              setShowLyrics(next);
              try {
                await window.mainApi.miniPlayerApi.setExpanded(next);
              } catch {
              }
            }}
            title={showLyrics ? '收起歌词' : '展开歌词'}
            aria-pressed={showLyrics}
          >
            <i className={`fas ${showLyrics ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
          </button>
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
