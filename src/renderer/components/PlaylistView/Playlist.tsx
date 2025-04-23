import React, { useEffect, useState } from 'react';
import { PlaylistModel, TrackModel } from '@src/shared/types';
import ContextMenu from './ContextMenu';
import Track from '@components/PlaylistView/Track';
import Player from '@components/Player';

interface PlaylistProps {
  filteredTracks: TrackModel[];
  playlists: PlaylistModel[];
  currentPlaylist: PlaylistModel;
  refreshPlaylists: () => void;
  player: Player;
}


export function Playlist({
                           filteredTracks,
                           playlists,
                           currentPlaylist,
                           refreshPlaylists = () => {
                           },
                           player,
                         }: PlaylistProps) {
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedTrack, setSelectedTrack] = useState<TrackModel>(null); // 添加 selectedTrack 状态

  // 监听滚动事件，显示/隐藏返回顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 滚动到页面顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleRightClick = (e: { preventDefault: () => void; pageX: number; pageY: number; }, track: TrackModel) => {
    e.preventDefault();
    setContextMenuPosition({ x: e.pageX - window.scrollX, y: e.pageY - window.scrollY });
    setSelectedTrack(track); // 设置选中的 track
    setContextMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setContextMenuVisible(false);
    setSelectedTrack(null); // 清除选中的 track
  };


  // 点击页面其他地方时隐藏右键菜单
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuVisible) {
        setContextMenuVisible(false); // 点击页面其他地方时隐藏菜单
      }
    };

    // 监听全局点击事件
    window.addEventListener('click', handleClickOutside);

    return () => {
      // 清除事件监听器
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenuVisible]);

  //
  // window.contextMenuVisible = contextMenuVisible;
  // window.contextMenuPosition = contextMenuPosition;
  // window.selectedTrack = selectedTrack;


  return (
    <div className="mt-6 Playlist">
      <table className="w-full text-left table-fixed">
        <thead>
        <tr className="border-b border-gray-700">
          <th className="py-2 w-8 text-center">#</th>
          <th className="py-2 w-1/2">标题</th>
          <th className="py-2 w-1/4 hidden md:table-cell">专辑</th>
          <th className="py-2 w-1/6 hidden lg:table-cell">添加日期</th>
          <th className="py-2 w-12">
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

      {/* 返回顶部按钮 */}
      {showScrollToTop && (
        <button
          className="scroll-to-top-button"
          onClick={scrollToTop}
          aria-label="返回顶部"
        >
          <i className="fas fa-arrow-up"></i>
        </button>
      )}

      {/* 渲染右键菜单 */}
      {contextMenuVisible && (
        <ContextMenu
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          track={selectedTrack} // 使用选中的 track
          handleCloseMenu={handleCloseMenu}
          playlists={playlists}
          player={player}
          currentPlaylist={currentPlaylist}
          refreshPlaylists={refreshPlaylists}
        />)}
    </div>
  );
}

