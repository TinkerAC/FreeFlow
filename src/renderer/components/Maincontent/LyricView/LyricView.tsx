// file: src/components/LyricView.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lyric } from '@src/shared/types';
import { lyricsContext } from '@main/app/electronContextApi';
import Player from '@components/Player';

interface LyricViewProps {
  player: Player;
}

const LyricView: React.FC<LyricViewProps> = ({ player }) => {
  /* --------------------------- 状态 --------------------------- */
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [error, setError] = useState('');
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
      if (!player.playQueue.currentTrack) {
        setError('当前没有播放的歌曲');
        return;
      }
      try {
        const lyricData = await lyricsContext.getLyrics(player.playQueue.currentTrack);
        setLyric(lyricData);
      } catch (e) {
        console.error('[fetchLyric] ', e);
        setError('加载歌词失败');
      }
    })();
  }, [player.playQueue.currentTrack]);

  /* --------------------------- 监听用户交互 --------------------------- */
  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const markUserInteraction = (_e: Event) => {
      if (isAutoScrollingRef.current) return;
      lastUserInteractionRef.current = Date.now();

      // 显示时间刻度
      setShowTimestamp(true);
      // 若已有隐藏计时器，清掉
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => setShowTimestamp(false), 2000);
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
    if (activeIndex === null || !lyricsContainerRef.current || !lyric) return;
    if (lastActiveIndexRef.current === activeIndex) return; // 与上次相同
    if (Date.now() - lastUserInteractionRef.current < 3500) return; // 最近有手动滚

    lastActiveIndexRef.current = activeIndex;

    const activeElem = lyricsContainerRef.current.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    if (!activeElem) return;

    const offset =
      activeElem.offsetTop -
      lyricsContainerRef.current.clientHeight / 2 +
      activeElem.clientHeight / 2;
    isAutoScrollingRef.current = true;
    lyricsContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
    setTimeout(() => (isAutoScrollingRef.current = false), 1500);
  }, [activeIndex, lyric]);

  /* --------------------------- 渲染行 --------------------------- */
  const renderLine = (line: { time: number; text: string }, i: number) => {
    const nowMs = player.currentTime * 1000;
    const next = lyric?.lines[i + 1];
    const isActive = nowMs >= line.time && (!next || nowMs < next.time);

    const timeText = new Date(line.time).toISOString().slice(14, -5); // mm:ss

    return (
      <p
        key={i}
        data-index={i}
        onClick={() => player.setCurrentTime(line.time / 1000)}
        className={`cursor-pointer my-2 leading-6 transition-colors text-center ${
          isActive ? 'text-white text-lg font-bold' : 'text-gray-400'
        }`}
      >
        {/* 时间刻度：平滑透明度切换 */}
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

  /* --------------------------- UI --------------------------- */
  if (error) return <div className="text-white p-4">{error}</div>;
  if (!lyric) return <div className="text-white p-4">正在加载歌词...</div>;

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
            // 同时触发时间刻度显示
            setShowTimestamp(true);
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            hideTimerRef.current = window.setTimeout(() => setShowTimestamp(false), 2000);
          }
        }}
      >
        {lyric.lines.map(renderLine)}
      </div>
    </div>
  );
};

export default LyricView;
