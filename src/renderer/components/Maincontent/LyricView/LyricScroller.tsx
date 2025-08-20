import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './LyricScroller.module.css';
import { LyricLine } from '@src/shared/domainModel/lyricLine';

type LyricType = 'origin' | 'pronunciation' | 'translation';

interface LyricScrollerProps {
  title?: string;
  lines: LyricLine[];
  loading: boolean;
  error?: string | null;
  activeIndex: number | null;
  activeType: LyricType;
  onTypeChange: (type: LyricType) => void;
  hasOrigin?: boolean;
  hasPronunciation?: boolean;
  hasTranslation?: boolean;
  onLineClick?: (timeMs: number) => void;
  showChips?: boolean;
}

const LyricScroller: React.FC<LyricScrollerProps> = ({
  title = '歌词',
  lines,
  loading,
  error,
  activeIndex,
  activeType,
  onTypeChange,
  hasOrigin = false,
  hasPronunciation = false,
  hasTranslation = false,
  onLineClick,
  showChips = true,
}) => {
  // 滚动控制
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<number>(0);
  const lastActiveRef = useRef<number | null>(null);

  // 自动滚动至当前行
  useEffect(() => {
    if (activeIndex == null || !viewportRef.current) return;
    if (lastActiveRef.current === activeIndex) return;
    if (Date.now() - lastScrollRef.current < 3500) return; // 3.5s 冷却，避免与手动滚动冲突

    lastActiveRef.current = activeIndex;
    const target = viewportRef.current.querySelector<HTMLDivElement>(
      `[data-index='${activeIndex}']`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  // 骨架
  const Skeleton = () => (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className={styles.skel} />
      ))}
      <div className={styles.hint}>加载中…</div>
    </>
  );

  // 顶部 chip
  const Chip: React.FC<{
    type: LyricType;
    label: string;
    disabled?: boolean;
  }> = ({ type, label, disabled }) => {
    const active = activeType === type;
    return (
      <button
        type="button"
        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
        onClick={() => !disabled && onTypeChange(type)}
        disabled={disabled}
        aria-pressed={active}
        title={label}
      >
        {label}
      </button>
    );
  };

  // 行渲染
  const renderLine = (line: LyricLine, i: number) => {
    const ai = activeIndex ?? -1;
    const dist = Math.abs(i - ai);
    const cls =
      ai === i
        ? styles.lineActive
        : dist === 1
        ? styles.lineNear1
        : dist === 2
        ? styles.lineNear2
        : styles.lineFar;

    return (
      <motion.p
        layout
        key={i}
        data-index={i}
        className={`${styles.line} ${cls}`}
        onClick={() => onLineClick?.(line.time)}
        initial={false}
        animate={{ opacity: ai === i ? 1 : 0.78 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        {line.text}
      </motion.p>
    );
  };

  return (
    <div className={styles.right}>
      <div className={styles.topbar}>
        <div className={styles.topTitle}>{title}</div>
        {showChips ? (
          <div className={styles.chips}>
            <Chip type="origin" label="原" disabled={!hasOrigin} />
            <Chip type="pronunciation" label="音" disabled={!hasPronunciation} />
            <Chip type="translation" label="译" disabled={!hasTranslation} />
          </div>
        ) : (
          <div className={styles.chips} />
        )}
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onScroll={() => (lastScrollRef.current = Date.now())}
      >
        <div className={styles.scrollInner}>
          {error ? (
            <p className={styles.empty}>加载失败：{error}</p>
          ) : loading ? (
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
  );
};

export default LyricScroller;
