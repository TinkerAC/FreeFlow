import React, { useEffect, useMemo, useRef, useState } from 'react';
import { lyricsContext } from '@main/core/electronContextApi';
import Player from '@renderer/core/player/Player';
import { MainContentViewStack } from '@components/Maincontent/MainContentViewStack';
import { Lyric } from '@src/shared/domainModel/lyricLine';

interface LyricViewProps {
  player: Player;
  viewStack?: MainContentViewStack;
}

const LyricView: React.FC<LyricViewProps> = ({ player, viewStack }) => {
  /* --------------------------- 状态 --------------------------- */
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTimestamp, setShowTimestamp] = useState(false);

  /* --------------------------- 引用 --------------------------- */
  const lastUserInteractionRef = useRef(0);
  const lastActiveIndexRef = useRef<number | null>(null);
  const isAutoScrollingRef = useRef(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  /* --------------------------- 拉取歌词 --------------------------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      if (!player.playQueue.currentTrack) {
        setError('当前没有播放的歌曲');
        setLoading(false);
        return;
      }
      try {
        const lyricData = await lyricsContext.getLyrics(
          player.playQueue.currentTrack,
        );
        setLyric(lyricData);
      } catch (e) {
        console.error('[fetchLyric] ', e);
        setError('加载歌词失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [player.playQueue.currentTrack]);

  /* --------------------------- 监听用户交互 --------------------------- */
  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    const markUserInteraction = (_e: Event) => {
      if (isAutoScrollingRef.current) return;
      lastUserInteractionRef.current = Date.now();

      setShowTimestamp(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(
        () => setShowTimestamp(false),
        2000,
      );
    };

    ['wheel', 'mousedown', 'touchstart'].forEach((ev) =>
      container.addEventListener(ev, markUserInteraction),
    );
    return () => {
      ['wheel', 'mousedown', 'touchstart'].forEach((ev) =>
        container.removeEventListener(ev, markUserInteraction),
      );
    };
  }, []);

  /* --------------------------- 计算当前行 --------------------------- */
  const activeIndex = useMemo(() => {
    if (!lyric) return null;
    const nowMs = player.currentTime * 1000;
    const idx =
      lyric.lines.findIndex((line, i) => {
        const next = lyric.lines[i + 1];
        return nowMs >= line.time && (!next || nowMs < next.time);
      }) ?? -1;
    return idx === -1 ? lyric.lines.length - 1 : idx;
  }, [lyric, player.currentTime]);

  /* --------------------------- 自动滚动 --------------------------- */
  useEffect(() => {
    if (
      activeIndex === null ||
      !lyricsContainerRef.current ||
      !lyric ||
      loading
    ) {
      return;
    }
    if (lastActiveIndexRef.current === activeIndex) return;
    if (Date.now() - lastUserInteractionRef.current < 3500) return;

    lastActiveIndexRef.current = activeIndex;

    const activeElem = lyricsContainerRef.current.querySelector<HTMLElement>(
      `[data-index=\"${activeIndex}\"]`,
    );
    if (!activeElem) return;

    const offset =
      activeElem.offsetTop -
      lyricsContainerRef.current.clientHeight / 2 +
      activeElem.clientHeight / 2;
    isAutoScrollingRef.current = true;
    lyricsContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    setTimeout(() => (isAutoScrollingRef.current = false), 1500);
  }, [activeIndex, lyric, loading]);

  /* --------------------------- 渲染行 --------------------------- */
  const renderLine = (line: { time: number; text: string }, i: number) => {
    const nowMs = player.currentTime * 1000;
    const next = lyric?.lines[i + 1];
    const isActive = nowMs >= line.time && (!next || nowMs < next.time);

    const timeText = new Date(line.time)
      .toISOString()
      .slice(14, -5); // mm:ss

    return (
      <p
        key={i}
        data-index={i}
        onClick={() => player.setCurrentTime(line.time / 1000)}
        className={`cursor-pointer my-2 leading-6 transition-colors text-center ${
          isActive ? 'text-white text-lg font-bold' : 'text-gray-400'
        }`}
      >
        <span
          className={`inline-block w-[50px] text-right mr-2 text-sm transition-opacity duration-300 ${
            showTimestamp ? 'opacity-70' : 'opacity-0'
          }`}
        >
          {timeText}
        </span>
        {line.text}
      </p>
    );
  };

  /* --------------------------- Skeleton Shimmer --------------------------- */
  const shimmerStyle: React.CSSProperties = {
    background: 'linear-gradient(90deg, #374151 25%, #4B5563 50%, #374151 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 2s infinite',
  };

  const renderSkeleton = () => (
    <>  {/* 注入 keyframes */}
      <style>{
        `@keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }`
      }</style>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmerStyle,
            height: '1rem',
            width: `${Math.floor(60 + Math.random() * 30)}%`,
            borderRadius: '0.25rem',
            margin: '0.5rem 0',
          }}
        />
      ))}
    </>
  );

  /* --------------------------- UI --------------------------- */
  if (error) return <div className="text-white p-4">{error}</div>;

  return (
    <div className="flex h-full w-full bg-gray-900">
      {/* 封面 */}
      <div className="w-2/5 flex justify-center items-center bg-gray-800">
        {player.playQueue.currentTrack && (
          <img
            src={player.playQueue.currentTrack.cover_src}
            alt="封面"
            className="max-w-[95%] max-h-[95%] rounded-lg shadow-lg"
          />
        )}
      </div>

      {/* 歌词区 */}
      <div
        ref={lyricsContainerRef}
        className="relative w-3/5 p-5 overflow-y-auto bg-black/30 backdrop-blur-lg no-scrollbar flex flex-col items-center"
        onScroll={() => {
          if (!isAutoScrollingRef.current) {
            lastUserInteractionRef.current = Date.now();
            setShowTimestamp(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            hideTimerRef.current = window.setTimeout(
              () => setShowTimestamp(false),
              2000,
            );
          }
        }}
      >
        {loading || !lyric
          ? renderSkeleton()
          : lyric.lines.map(renderLine)}
      </div>
    </div>
  );
};

export default LyricView;