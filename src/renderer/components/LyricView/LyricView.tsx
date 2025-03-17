import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lyric, PlayerState } from '@src/shared/types';
import { lyricsContext } from '@main/app/electronContextApi';

interface LyricViewProps {
  playerState: PlayerState;
  /**
   * 设置当前播放进度（单位：秒）
   */
  setCurrentTime: (time: number) => void;
}

const LyricView: React.FC<LyricViewProps> = ({ playerState, setCurrentTime }) => {
  // 保存歌词数据与错误信息的状态
  const [lyric, setLyric] = useState<Lyric | null>(null);
  const [error, setError] = useState<string>('');
  // 记录用户最后一次手动交互的时间（毫秒）
  const lastUserInteractionRef = useRef<number>(0);
  // 记录上一次自动滚动时选中的歌词行索引
  const lastActiveIndexRef = useRef<number | null>(null);
  // 标记是否正在自动滚动（避免自动滚动期间更新用户交互时间）
  const isAutoScrollingRef = useRef<boolean>(false);
  // 歌词滚动容器引用
  const lyricsContainerRef = useRef<HTMLDivElement>(null);

  // 获取歌词数据
  useEffect(() => {
    async function fetchLyric() {
      if (!playerState.currentTrackInfo) {
        setError('当前没有播放的歌曲');
        return;
      }
      try {
        const lyricData = await lyricsContext.getLyrics(playerState.currentTrackInfo);
        console.log('[fetchLyric] 获取歌词成功：', lyricData);
        setLyric(lyricData);
      } catch (err) {
        console.error('[fetchLyric] 获取歌词出错:', err);
        setError('加载歌词失败');
      }
    }

    fetchLyric().then();
  }, [playerState.currentTrackInfo]);

  // 添加用户交互事件监听（监听 wheel、mousedown、touchstart）
  useEffect(() => {
    const container = lyricsContainerRef.current;
    if (!container) return;

    const updateUserInteraction = (event: Event) => {
      if (!isAutoScrollingRef.current) {
        lastUserInteractionRef.current = Date.now();
        console.log('[UserInteraction] 事件类型：', event.type, '更新 lastUserInteractionRef：', lastUserInteractionRef.current);
      } else {
        console.log('[UserInteraction] 自动滚动期间忽略事件：', event.type);
      }
    };

    container.addEventListener('wheel', updateUserInteraction);
    container.addEventListener('mousedown', updateUserInteraction);
    container.addEventListener('touchstart', updateUserInteraction);

    return () => {
      container.removeEventListener('wheel', updateUserInteraction);
      container.removeEventListener('mousedown', updateUserInteraction);
      container.removeEventListener('touchstart', updateUserInteraction);
    };
  }, []);

  // 使用 useMemo 根据 currentTime 与歌词数据计算当前活跃的歌词行索引
  const activeIndex = useMemo(() => {
    if (!lyric) return null;
    const currentTimeMs = playerState.currentTime * 1000;
    let idx = lyric.lines.findIndex((line, index) => {
      const nextLine = lyric.lines[index + 1];
      if (!nextLine) return currentTimeMs >= line.time;
      return currentTimeMs >= line.time && currentTimeMs < nextLine.time;
    });
    if (idx === -1) idx = lyric.lines.length - 1;
    return idx;
  }, [playerState.currentTime, lyric]);

  // 自动滚动：当 activeIndex 变化且用户在过去5秒内无手动操作时，触发滚动
  useEffect(() => {
    if (activeIndex === null || !lyricsContainerRef.current || !lyric) return;

    // 如果 activeIndex 与上次相同，则不触发滚动
    if (lastActiveIndexRef.current === activeIndex) {
      return;
    }

    const now = Date.now();
    if (now - lastUserInteractionRef.current < 3500) {
      return;
    }

    // 更新 lastActiveIndexRef 为当前 activeIndex
    lastActiveIndexRef.current = activeIndex;

    const activeElem = lyricsContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeElem) {
      const containerHeight = lyricsContainerRef.current.clientHeight;
      const elemOffsetTop = (activeElem as HTMLElement).offsetTop;
      const elemHeight = (activeElem as HTMLElement).clientHeight;
      const scrollTop = elemOffsetTop - containerHeight / 2 + elemHeight / 2;
      isAutoScrollingRef.current = true;
      lyricsContainerRef.current.scrollTo({ top: scrollTop, behavior: 'smooth' });
      // 延时重置自动滚动标记
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 1500);
    }
  }, [activeIndex, playerState.currentTime, lyric]);

  // 渲染每行歌词，点击后调用 setCurrentTime 设置播放进度
  const renderLyricLine = (line: { time: number; text: string }, index: number) => {
    const currentTimeMs = playerState.currentTime * 1000;
    const nextLine = lyric?.lines[index + 1];
    const isActive = currentTimeMs >= line.time && (!nextLine || currentTimeMs < nextLine.time);
    return (
      <p
        key={index}
        data-index={index}
        onClick={() => {
          console.log('[Click] 歌词行点击，时间(ms):', line.time);
          setCurrentTime(line.time / 1000);
        }}
        className={`cursor-pointer text-base leading-6 my-2 ${
          isActive ? 'text-white text-lg font-bold' : 'text-gray-400'
        }`}
      >
        <span className="text-sm text-gray-500 mr-2">
          {new Date(line.time).toISOString().slice(14, -5)}
        </span>
        {line.text}
      </p>
    );
  };

  if (error) {
    return <div className="text-white p-4">{error}</div>;
  }
  if (!lyric) {
    return <div className="text-white p-4">正在加载歌词...</div>;
  }

  return (
    <div className="flex h-full w-full bg-gray-900">
      {/* 左侧封面区域，略微调大封面显示 */}
      <div className="w-2/5 flex justify-center items-center bg-gray-800">
        {playerState.currentTrackInfo && (
          <img
            src={playerState.currentTrackInfo.cover_src}
            alt="封面"
            className="max-w-[95%] max-h-[95%] rounded-lg shadow-lg"
          />
        )}
      </div>
      {/* 右侧歌词区域，添加毛玻璃效果、no-scrollbar 插件以及右侧指示线 */}
      <div
        className="relative w-3/5 p-5 overflow-y-auto bg-black/30 backdrop-blur-lg no-scrollbar"
        ref={lyricsContainerRef}
        onScroll={() => {
          if (!isAutoScrollingRef.current) {
            lastUserInteractionRef.current = Date.now();
          }
        }}
      >
        {lyric.lines.map((line, index) => renderLyricLine(line, index))}
        {/* 可选：右侧指示线 */}
        {/* <div className="absolute right-0 top-0 h-full w-1 bg-white opacity-50 pointer-events-none" /> */}
      </div>
    </div>
  );
};

export default LyricView;