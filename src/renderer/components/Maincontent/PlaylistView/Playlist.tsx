import React, { useEffect, useState } from 'react';
import ContextMenu from './ContextMenu';
import Track from '@components/Maincontent/PlaylistView/Track';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';

// 接口定义：增加了从父组件接收滚动容器引用的 prop
interface PlaylistProps {
  filteredTracks: TrackEntity[];
  player: PlayerController;
  musicLibraryController: MusicLibraryController;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}


export function Playlist({
                           filteredTracks,
                           player,
                           musicLibraryController,
                           scrollContainerRef,
                         }: PlaylistProps) {
  // 状态管理
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTrack, setSelectedTrack] = useState<TrackEntity | null>(null);

  // 效果钩子: 监听滚动容器的滚动事件，以决定是否显示悬浮按钮
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // 当垂直滚动距离大于 200px 时显示按钮
      if (container.scrollTop > 200) {
        setShowFloatingButtons(true);
      } else {
        setShowFloatingButtons(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef]); // 依赖于滚动容器的引用

  // 效果钩子: 点击页面其他地方时隐藏右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuVisible) {
        setContextMenuVisible(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenuVisible]);

  // 函数: 平滑滚动到页面顶部
  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /**
   * 函数: 定位到正在播放的曲目 (仅在当前歌单视图内查找)
   */
  const locatePlayingTrack = () => {
    // 1. 从播放器控制器获取当前播放的曲目
    const currentTrack = player.playQueue.currentTrack;

    if (!currentTrack) {
      console.log('当前没有播放的歌曲。');
      // 可选: 在此处添加用户提示，如 Toast
      return;
    }

    // 2. 检查该曲目是否存在于当前显示的列表中 (filteredTracks)
    const trackInCurrentView = filteredTracks.find(track => track.id === currentTrack.id);

    if (trackInCurrentView) {
      // 3. 如果在当前视图中找到了歌曲，则获取其 DOM 元素
      const trackElement = document.getElementById(`track-${currentTrack.id}`);
      if (trackElement) {
        console.log(`在当前歌单中找到歌曲: ${currentTrack.title}，正在滚动...`);

        // 4. 将该元素平滑滚动到视图的中心位置
        trackElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // 5. (可选) 为定位到的行添加一个临时的视觉高亮效果
        trackElement.classList.add('locating-highlight');
        setTimeout(() => {
          trackElement.classList.remove('locating-highlight');
        }, 1500); // 1.5秒后自动移除高亮样式
      }
    } else {
      // 6. 如果当前视图中没有这首歌，则不执行任何操作，仅在控制台输出信息
      console.log(`当前播放的歌曲 "${currentTrack.title}" 不在当前歌单视图中。`);
      // 可选: 在此处添加用户提示
    }
  };

  // 函数: 处理右键点击，显示上下文菜单
  const handleRightClick = (e: React.MouseEvent, track: TrackEntity) => {
    e.preventDefault();
    const containerRect = scrollContainerRef.current?.getBoundingClientRect();
    const offsetX = containerRect?.left || 0;
    const offsetY = containerRect?.top || 0;

    setContextMenuPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY });
    setSelectedTrack(track);
    setContextMenuVisible(true);
  };

  // 函数: 关闭上下文菜单
  const handleCloseMenu = () => {
    setContextMenuVisible(false);
    setSelectedTrack(null);
  };

  return (
    <div className="mt-6 Playlist">
      <table className="w-full text-left table-fixed">
        <colgroup>
          <col className="w-8" />
          <col className="w-1/2" />
          <col className="hidden md:table-cell w-1/4" />
          <col className="hidden lg:table-cell w-1/6" />
          <col className="w-12" />
        </colgroup>
        <thead>
        <tr className="border-b border-gray-700">
          <th className="py-2 w-8 text-center">#</th>
          <th className="py-2 w-1/2">标题</th>
          <th className="py-2 w-1/4 hidden md:table-cell">专辑</th>
          <th className="py-2 w-1/6 hidden lg:table-cell">添加日期</th>
          <th className="py-2 w-12 content-center">
            <i className="fas fa-clock" aria-label="时长"></i>
          </th>
        </tr>
        </thead>
        <tbody>
        {filteredTracks.length ? (
          filteredTracks.map((track, index) => (
            <Track
              key={track.id}
              track={track}
              index={index}
              player={player}
              onRightClick={(e) => handleRightClick(e, track)}
            />
          ))
        ) : (
          <tr>
            <td colSpan={5} className="text-center py-4 text-gray-400">
              无曲目可显示
            </td>
          </tr>
        )}
        </tbody>
      </table>

      {/* 悬浮按钮容器: 当 showFloatingButtons 为 true 时显示 */}
      {showFloatingButtons && (
        <div className="fixed bottom-24 right-8 z-50 flex flex-col items-center">
          {/* 新增: 定位到正在播放的曲目按钮 */}
          <button
            className="w-12 h-12 mb-3 flex items-center justify-center bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-110 focus:outline-none"
            onClick={locatePlayingTrack}
            aria-label="定位到正在播放的曲目"
            title="定位到正在播放的曲目"
          >
            <i className="fas fa-music"></i>
          </button>

          {/* 返回顶部按钮 */}
          <button
            className="w-12 h-12 flex items-center justify-center bg-gray-700 text-white rounded-full shadow-lg hover:bg-gray-800 transition-transform transform hover:scale-110 focus:outline-none"
            onClick={scrollToTop}
            aria-label="返回顶部"
            title="返回顶部"
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
      )}

      {/* 渲染右键菜单 */}
      {contextMenuVisible && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          track={selectedTrack}
          handleCloseMenu={handleCloseMenu}
          player={player}
          musicLibraryController={musicLibraryController}
        />)}
    </div>
  );
}