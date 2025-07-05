import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { lyricsContext } from "@renderer/core/electronContextApi";
import PlayerController from "@renderer/core/controller/PlayerController";
import { Lyric, LyricLine } from "@src/shared/domainModel/lyricLine";
import { ScrollArea } from '@components/CheckBox';

interface LyricViewProps {
  player: PlayerController;
}

/** 快速定位当前行 */
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
  /* --------------------------- 状态 --------------------------- */
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeType, setActiveType] = useState<"origin" | "pronunciation" | "translation">("origin");

  /* --------------------------- 引用 --------------------------- */
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef<number>(0);
  const autoScrollRef = useRef(false);
  const lastActiveRef = useRef<number | null>(null);

  /* --------------------------- 获取歌词 --------------------------- */
  useEffect(() => {
    (async () => {
      const track = player.playQueue.currentTrack;
      if (!track) return;
      try {
        setLoading(true);
        setError(null);
        const data = await lyricsContext.getLyrics(track);
        setLyric(data);
        // 设置默认展示顺序：原 -> 音 -> 译
        if (data.originLines.length) setActiveType("origin");
        else if (data.pronunciationLines.length) setActiveType("pronunciation");
        else setActiveType("translation");
      } catch (e: any) {
        setError(e.message ?? "加载歌词失败");
      } finally {
        setLoading(false);
      }
    })();
  }, [player.playQueue.currentTrack]);

  /* --------------------------- 可用类型 --------------------------- */
  const hasOrigin = !!lyric?.originLines.length;
  const hasPronunciation = !!lyric?.pronunciationLines.length;
  const hasTranslation = !!lyric?.translationLines.length;

  /* --------------------------- 决定渲染行 --------------------------- */
  const lines: LyricLine[] = useMemo(() => {
    if (!lyric) return [];
    switch (activeType) {
      case "pronunciation":
        return lyric.pronunciationLines;
      case "translation":
        return lyric.translationLines;
      default:
        return lyric.originLines;
    }
  }, [lyric, activeType]);

  /* --------------------------- 当前行索引 --------------------------- */
  const activeIndex = useMemo(() => {
    if (!lines.length) return null;
    return findActiveIndex(lines, player.currentTime * 1000);
  }, [lines, player.currentTime]);

  /* --------------------------- 自动滚动 --------------------------- */
  useEffect(() => {
    if (activeIndex == null || !containerRef.current) return;
    if (lastActiveRef.current === activeIndex) return;
    if (Date.now() - lastScrollRef.current < 3500) return;

    lastActiveRef.current = activeIndex;
    const target = containerRef.current.querySelector<HTMLDivElement>(
      `[data-index='${activeIndex}']`,
    );
    if (!target) return;

    autoScrollRef.current = true;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => (autoScrollRef.current = false), 700);
  }, [activeIndex]);

  /* --------------------------- Skeleton --------------------------- */
  const renderSkeleton = () => (
    <>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="my-3 h-4 w-2/3 rounded"
          style={{
            background:
              "linear-gradient(90deg,#374151 25%,#4B5563 50%,#374151 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
          }}
        />
      ))}
    </>
  );

  /* --------------------------- 行渲染 --------------------------- */
  const renderLine = (line: LyricLine, i: number) => {
    const active = activeIndex === i;
    return (
      <motion.p
        layout
        key={i}
        data-index={i}
        className="my-2 cursor-pointer select-none text-center leading-7"
        onClick={() => player.setCurrentTime(line.time / 1000)}
        initial={false}
        animate={{ scale: active ? 1.1 : 1, opacity: active ? 1 : 0.65 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {line.text}
      </motion.p>
    );
  };

  /* --------------------------- 顶部切换按钮 --------------------------- */
  const SwitchButton: React.FC<{
    type: "origin" | "pronunciation" | "translation";
    label: string;
  }> = ({ type, label }) => {
    const active = activeType === type;
    return (
      <span
        onClick={() => setActiveType(type)}
        className={`cursor-pointer text-xs font-bold transition-colors ${active ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
      >
        {label}
      </span>
    );
  };

  /* --------------------------- 主 UI --------------------------- */
  if (error) return <div className="p-4 text-red-400">{error}</div>;

  return (
    <div className="flex h-full w-full bg-black/90">
      {/* 左侧封面 */}
      <div className="flex w-2/5 items-center justify-center bg-gray-800/50 p-4">
        {player.playQueue.currentTrack && (
          <motion.img
            key={player.playQueue.currentTrack.id}
            src={player.playQueue.currentTrack.cover_src}
            alt="cover"
            className="max-h-[95%] max-w-[95%] rounded-xl shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </div>

      {/* 右侧歌词区 */}
      <div className="relative flex w-3/5 flex-col">
        {/* 左上角切换按钮 */}
        <div className="absolute left-3 top-2 z-10 flex gap-3">
          {hasOrigin && <SwitchButton type="origin" label="原" />}
          {hasPronunciation && <SwitchButton type="pronunciation" label="音" />}
          {hasTranslation && <SwitchButton type="translation" label="译" />}
        </div>

        {/* 歌词列表 */}
        <ScrollArea
          className="h-full"
          viewportClassName="no-scrollbar"
          onScroll={() => (lastScrollRef.current = Date.now())}
        >
          <div
            ref={containerRef}
            className="flex flex-col items-center px-8 py-10"
          >
            {loading || !lyric ? (
              renderSkeleton()
            ) : lines.length ? (
              <AnimatePresence initial={false}>{lines.map(renderLine)}</AnimatePresence>
            ) : (
              <p className="text-gray-400">无可显示的歌词</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LyricView;