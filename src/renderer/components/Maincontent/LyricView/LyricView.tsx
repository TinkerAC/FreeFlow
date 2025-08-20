import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './LyricView.module.css';
import Turntable from './Turntable';
import LyricScroller from './LyricScroller';

import { lyricsContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { Lyric, LyricLine } from '@src/shared/domainModel/lyricLine';
import { DefaultCover } from '@components/static';

interface LyricViewProps {
  player: PlayerController;
}

/** 二分定位当前行（nowMs 介于行[i] 与 行[i+1] 之间） */
const findActiveIndex = (lines: { time: number }[], nowMs: number) => {
  let l = 0,
    r = lines.length - 1;
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
  const [activeType, setActiveType] = useState<
    'origin' | 'pronunciation' | 'translation'
  >('origin');

  /* ---------------- 引用 ---------------- */
  // 由子组件内部管理滚动与冷却

  /* ---------------- 载入歌词 ---------------- */
  const loadLyrics = useCallback(async () => {
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
  }, [player.playQueue.currentTrack]);

  useEffect(() => {
    loadLyrics();
  }, [loadLyrics]);

  const hasOrigin = !!lyric?.originLines.length;
  const hasPronunciation = !!lyric?.pronunciationLines.length;
  const hasTranslation = !!lyric?.translationLines.length;

  /* ---------------- 当前渲染的行 ---------------- */
  const lines: LyricLine[] = useMemo(() => {
    if (!lyric) return [];
    switch (activeType) {
      case 'pronunciation':
        return lyric.pronunciationLines;
      case 'translation':
        return lyric.translationLines;
      default:
        return lyric.originLines;
    }
  }, [lyric, activeType]);

  /* ---------------- 当前行索引 ---------------- */
  const activeIndex = useMemo(() => {
    if (!lines.length) return null;
    return findActiveIndex(lines, (player.currentTime || 0) * 1000);
  }, [lines, player.currentTime]);

  // 自动滚动逻辑已迁移至 LyricScroller 内部

  /* ---------------- 左侧封面 src & 回退 ---------------- */
  const coverSrc = player.playQueue.currentTrack?.cover_src || DefaultCover;
  const onCoverError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.src !== DefaultCover) img.src = DefaultCover;
  };

  /* ---------------- 错误态交由子组件展示 ---------------- */

  /* ---------------- 正常 UI ---------------- */
  return (
    <div className={styles.root}>
      {/* 左：黑胶唱机（独立组件） */}
      <div className={styles.left}>
        <Turntable
          coverSrc={coverSrc}
          isPlaying={player.isPlaying}
          onCoverError={onCoverError}
        />
      </div>

      {/* 右：歌词（独立组件） */}
      <LyricScroller
        title='歌词'
        lines={lines}
        loading={loading || !lyric}
        error={error}
        activeIndex={activeIndex}
        activeType={activeType}
        onTypeChange={setActiveType}
        hasOrigin={hasOrigin}
        hasPronunciation={hasPronunciation}
        hasTranslation={hasTranslation}
        onLineClick={(timeMs) => player.setCurrentTime(timeMs / 1000)}
        onRetry={loadLyrics}
      />
    </div>
  );
};

export default LyricView;
