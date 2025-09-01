import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onRetry?: () => void;
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
  onRetry,
}) => {
  // 滚动控制状态
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastActiveRef = useRef<number | null>(null);
  const userScrollRef = useRef(false); // 是否检测到用户滚动意图
  const programmaticUntilRef = useRef(0); // 在该时间戳前的滚动视为程序触发
  const [isAutoScrollDisabled, setIsAutoScrollDisabled] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const autoResumeTimerRef = useRef<NodeJS.Timeout>();
  const scrollIdleDebounceRef = useRef<NodeJS.Timeout>();
  const prevTypeRef = useRef<LyricType | null>(null);

  // 滚动到当前行（支持强制忽略手动状态）
  const scrollToActive = useCallback((force = false) => {
    const idx = activeIndex;
    const viewport = viewportRef.current;
    if (idx == null || !viewport) return;
    if (!force && isAutoScrollDisabled) return;

    if (lastActiveRef.current === idx && !force) return;
    lastActiveRef.current = idx;

    const target = viewport.querySelector<HTMLDivElement>(`[data-index='${idx}']`);
    if (!target) return;

    // 程序滚动时间窗口，避免误判
    const windowMs = 600;
    programmaticUntilRef.current = Date.now() + windowMs;

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect();
      const vRect = viewport.getBoundingClientRect();
      const offset = rect.top - (vRect.top + vRect.height / 2 - rect.height / 2);
      if (Math.abs(offset) > 2) {
        viewport.scrollBy({ top: offset, behavior: 'smooth' });
      }
      programmaticUntilRef.current = Date.now() + 300;
    });
  }, [activeIndex, isAutoScrollDisabled]);

  // 处理手动滚动
  const handleScroll = useCallback(() => {
    const now = Date.now();
    // 处于程序滚动窗口内，忽略滚动事件
    if (now < programmaticUntilRef.current) return;

    // 若标记了用户意图，则禁用自动跟随，并在空闲后恢复
    if (userScrollRef.current) {
      setIsAutoScrollDisabled(true);
      setIsScrolling(true);

      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      autoResumeTimerRef.current = setTimeout(() => {
        setIsAutoScrollDisabled(false);
        setIsScrolling(false);
        userScrollRef.current = false;
      }, 2000);
    }

    // 滚动空闲去抖，结束后清理滚动态
    if (scrollIdleDebounceRef.current) clearTimeout(scrollIdleDebounceRef.current);
    scrollIdleDebounceRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 120);
  }, []);

  // 标记用户滚动意图（wheel/touch/pointer/键盘）
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const markUserIntent = () => {
      if (Date.now() < programmaticUntilRef.current) return;
      userScrollRef.current = true;
    };

    el.addEventListener('wheel', markUserIntent, { passive: true });
    el.addEventListener('touchstart', markUserIntent, { passive: true });
    el.addEventListener('pointerdown', markUserIntent, { passive: true });

    const handleKey = (e: KeyboardEvent) => {
      const keys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
      if (keys.includes(e.key)) markUserIntent();
    };
    el.addEventListener('keydown', handleKey);

    return () => {
      el.removeEventListener('wheel', markUserIntent as any);
      el.removeEventListener('touchstart', markUserIntent as any);
      el.removeEventListener('pointerdown', markUserIntent as any);
      el.removeEventListener('keydown', handleKey);
    };
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoResumeTimerRef.current) clearTimeout(autoResumeTimerRef.current);
      if (scrollIdleDebounceRef.current) clearTimeout(scrollIdleDebounceRef.current);
    };
  }, []);

  // 智能自动滚动至当前行（正常播放时）
  useEffect(() => {
    scrollToActive(false);
  }, [scrollToActive]);

  // 切换歌词类型时，立即强制滚动到当前行
  useEffect(() => {
    if (prevTypeRef.current !== null && prevTypeRef.current !== activeType) {
      scrollToActive(true);
    }
    prevTypeRef.current = activeType;
  }, [activeType, scrollToActive]);

  // 重置自动滚动状态（当歌曲切换时）
  useEffect(() => {
    setIsAutoScrollDisabled(false);
    setIsScrolling(false);
    lastActiveRef.current = null;
  }, [lines]);

  // 骨架屏组件 - 添加更多视觉变化
  const Skeleton = useMemo(() => (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div 
          key={i} 
          className={styles.skel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
      <motion.div 
        className={styles.hint}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        加载中…
      </motion.div>
    </>
  ), []);

  // 顶部 chip - 带更好的状态管理
  const Chip: React.FC<{
    type: LyricType;
    label: string;
    disabled?: boolean;
  }> = useCallback(({ type, label, disabled }) => {
    const active = activeType === type;
    return (
      <motion.button
        type="button"
        className={`${styles.chip} ${active ? styles.chipActive : ''}`}
        onClick={() => !disabled && onTypeChange(type)}
        disabled={disabled}
        aria-pressed={active}
        aria-label={`切换到${label}歌词`}
        title={disabled ? `无${label}歌词` : `切换到${label}歌词`}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        transition={{ duration: 0.1 }}
      >
        {label}
      </motion.button>
    );
  }, [activeType, onTypeChange]);

  // 行渲染 - 优化性能和动画
  const renderLine = useCallback((line: LyricLine, i: number) => {
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
        key={`${line.time}-${i}`}
        data-index={i}
        className={`${styles.line} ${cls}`}
        onClick={() => onLineClick?.(line.time)}
        initial={false}
        animate={{ opacity: ai === i ? 1 : 0.8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        role="button"
        tabIndex={0}
        aria-label={`跳转到: ${line.text}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onLineClick?.(line.time);
          }
        }}
      >
        {line.text}
      </motion.p>
    );
  }, [activeIndex, onLineClick]);

  // 错误重试组件
  const ErrorView = useMemo(() => (
    <motion.div 
      className={styles.errorContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className={styles.empty}>加载失败：{error}</p>
      {onRetry && (
        <motion.button
          className={styles.retryButton}
          onClick={onRetry}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="重试加载歌词"
        >
          重试
        </motion.button>
      )}
    </motion.div>
  ), [error, onRetry]);

  const [size, setSize] = useState<'small'|'medium'|'large'>('medium');

  return (
    <div className={ `${styles.right} ${size==='small'?styles.sizeSmall: size==='large'?styles.sizeLarge: styles.sizeMedium}` }>
      <div className={styles.topbar}>
        <div className={styles.topTitle}>
          {title}
          {isAutoScrollDisabled && (
            <motion.span 
              className={styles.scrollIndicator}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              · 手动滚动中
            </motion.span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          {showChips ? (
            <div className={styles.chips}>
              <Chip type="origin" label="原" disabled={!hasOrigin} />
              <Chip type="pronunciation" label="音" disabled={!hasPronunciation} />
              <Chip type="translation" label="译" disabled={!hasTranslation} />
            </div>
          ) : (
            <div className={styles.chips} />
          )}
          {/* 尺寸控制：小/中/大（Apple Music 风） */}
          <div className={styles.sizeCtrl} aria-label="歌词大小">
            <button className={`${styles.sizeBtn} ${size==='small'?styles.sizeActive:''}`} onClick={() => setSize('small')} title="小">A</button>
            <button className={`${styles.sizeBtn} ${size==='medium'?styles.sizeActive:''}`} onClick={() => setSize('medium')} title="中" style={{ fontSize: '110%' }}>A</button>
            <button className={`${styles.sizeBtn} ${size==='large'?styles.sizeActive:''}`} onClick={() => setSize('large')} title="大" style={{ fontSize: '125%' }}>A</button>
          </div>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        onScroll={handleScroll}
        role="main"
        aria-label="歌词内容"
      >
        <div className={styles.scrollInner}>
          {error ? (
            ErrorView
          ) : loading ? (
            Skeleton
          ) : lines.length ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {lines.map(renderLine)}
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default LyricScroller;
