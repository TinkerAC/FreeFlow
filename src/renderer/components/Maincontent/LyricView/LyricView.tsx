import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './LyricView.module.css';

import { lyricsContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { DefaultCover } from '@components/static';

interface LyricViewProps {
  player: PlayerController;
}

/** 二分定位当前行（nowMs 介于行[i] 与 行[i+1] 之间） */
const findActiveIndex = (lines: { time: number }[], nowMs: number) => {
  let l = 0, r = lines.length - 1;
  while (l <= r) {
    const m = (l + r) >>> 1;
    const next = lines[m + 1];
    if (nowMs >= lines[m].time && (!next || nowMs < next.time)) return m;
    nowMs < lines[m].time ? (r = m - 1) : (l = m + 1);
  }
  return 0;
};

const LyricView: React.FC<LyricViewProps> = ({ player }) => {
  /* ---------------- 状态 ---------------- */
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'origin' | 'pronunciation' | 'translation'>('origin');

  /* ---------------- 引用 ---------------- */
  const viewportRef = useRef<HTMLDivElement>(null);  // 真正滚动的容器
  const lastScrollRef = useRef<number>(0);           // 最近手动滚动时间
  const lastActiveRef = useRef<number | null>(null); // 上一次高亮行

  /* ---------------- 载入歌词 ---------------- */
  useEffect(() => {
    (async () => {
      const track = player.playQueue.currentTrack;
      if (!track) {
        setLyric(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await lyricsContext.getLyrics(track);
        setLyric(data);
        // 默认顺序：原 -> 音 -> 译
        if (data.originLines.length) setActiveType('origin');
        else if (data.pronunciationLines.length) setActiveType('pronunciation');
        else setActiveType('translation');
      } catch (e: any) {
        setError(e?.message ?? '加载歌词失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [player.playQueue.currentTrack]);

  const hasOrigin = !!lyric?.originLines.length;
  const hasPronunciation = !!lyric?.pronunciationLines.length;
  const hasTranslation = !!lyric?.translationLines.length;

  /* ---------------- 当前渲染的行 ---------------- */
  const lines: LyricLine[] = useMemo(() => {
    if (!lyric) return [];
    switch (activeType) {
      case 'pronunciation': return lyric.pronunciationLines;
      case 'translation':   return lyric.translationLines;
      default:              return lyric.originLines;
    }
  }, [lyric, activeType]);

  /* ---------------- 当前行索引 ---------------- */
  const activeIndex = useMemo(() => {
    if (!lines.length) return null;
    return findActiveIndex(lines, (player.currentTime || 0) * 1000);
  }, [lines, player.currentTime]);

  /* ---------------- 自动滚动到当前行 ---------------- */
  useEffect(() => {
    if (activeIndex == null || !viewportRef.current) return;
    if (lastActiveRef.current === activeIndex) return;
    // 最近有手动滚动就暂缓（3.5s 冷却）
    if (Date.now() - lastScrollRef.current < 3500) return;

    lastActiveRef.current = activeIndex;
    const target = viewportRef.current.querySelector<HTMLDivElement>(
      `[data-index='${activeIndex}']`,
    );
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  /* ---------------- 骨架 ---------------- */
  const Skeleton = () => (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={styles.skel} />
      ))}
      <div className={styles.hint}>加载中…</div>
    </>
  );

  /* ---------------- 行渲染 ---------------- */
  const renderLine = (line: LyricLine, i: number) => {
    const ai = activeIndex ?? -1;
    const dist = Math.abs(i - ai);
    const cls =
      ai === i ? styles.lineActive :
        dist === 1 ? styles.lineNear1 :
          dist === 2 ? styles.lineNear2 : styles.lineFar;

    return (
      <motion.p
        layout
        key={i}
        data-index={i}
        className={`${styles.line} ${cls}`}
        onClick={() => player.setCurrentTime(line.time / 1000)}
        initial={false}
        animate={{ scale: ai === i ? 1.06 : 1, opacity: ai === i ? 1 : 0.78 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      >
        {line.text}
      </motion.p>
    );
  };

  /* ---------------- 顶部 chip ---------------- */
  const Chip: React.FC<{
    type: 'origin' | 'pronunciation' | 'translation';
    label: string;
    disabled?: boolean;
  }> = ({ type, label, disabled }) => {
    const active = activeType === type;
    return (
      <button
        type="button"
        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
        onClick={() => !disabled && setActiveType(type)}
        disabled={disabled}
        aria-pressed={active}
        title={label}
      >
        {label}
      </button>
    );
  };

  /* ---------------- 左侧封面 src & 回退 ---------------- */
  const coverSrc = player.playQueue.currentTrack?.cover_src || DefaultCover;
  const onCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== DefaultCover) img.src = DefaultCover;
  };

  /* ---------------- 错误态 ---------------- */
  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.left}>
          <img className={styles.cover} src={coverSrc} onError={onCoverError} alt="cover" />
        </div>
        <div className={styles.right}>
          <div className={styles.topbar}>
            <div className={styles.topTitle}>歌词</div>
            <div className={styles.chips} />
          </div>
          <div className={styles.viewport}>
            <div className={styles.scrollInner}>
              <p className={styles.empty}>加载失败：{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- 正常 UI ---------------- */
  return (
    <div className={styles.root}>
      {/* 左：封面 */}
      <div className={styles.left}>
        {coverSrc ? (
          <motion.img
            key={player.playQueue.currentTrack?.id ?? 'cover'}
            src={coverSrc}
            onError={onCoverError}
            alt="cover"
            className={styles.cover}
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45 }}
          />
        ) : (
          <img className={styles.cover} src={DefaultCover} alt="cover" />
        )}
      </div>

      {/* 右：歌词 */}
      <div className={styles.right}>
        <div className={styles.topbar}>
          <div className={styles.topTitle}>歌词</div>
          <div className={styles.chips}>
            <Chip type="origin" label="原" disabled={!hasOrigin} />
            <Chip type="pronunciation" label="音" disabled={!hasPronunciation} />
            <Chip type="translation" label="译" disabled={!hasTranslation} />
          </div>
        </div>

        <div
          ref={viewportRef}
          className={styles.viewport}
          onScroll={() => (lastScrollRef.current = Date.now())}
        >
          <div className={styles.scrollInner}>
            x{loading || !lyric ? (
              <Skeleton />
            ) : lines.length ? (
              <AnimatePresence initial={false}>
                {lines.map(renderLine)}
              </AnimatePresence>
            ) : (
              <p className={styles.empty}>无可显示的歌词</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LyricView;