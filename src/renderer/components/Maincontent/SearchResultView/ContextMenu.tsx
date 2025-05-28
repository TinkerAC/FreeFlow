// src/renderer/components/SearchResultView/ContextMenu.tsx
import React, { useState } from 'react';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

interface ContextMenuProps {
  x: number;
  y: number;
  track: TrackEntity;
  addToLibrary: (track: TrackEntity) => void;
  handleCloseMenu: () => void;
  addTrackToPlaylist: (track: TrackEntity, playlistId: number) => void;
  playlists: PlaylistEntity[];
  player: PlayerController;
}

function ContextMenu({
                       x,
                       y,
                       track,
                       addToLibrary,
                       handleCloseMenu,
                       addTrackToPlaylist,
                       playlists,
                       player,
                     }: ContextMenuProps) {

  const [showSubMenu, setShowSubMenu] = useState(false); // 控制是否显示子菜单

  if (!track) return null;

  return (
    <div
      style={{
        position: 'fixed', // 使用 fixed 使菜单相对于视口定位
        top: `${y}px`,
        left: `${x}px`,
        backgroundColor: '#333', // 深色背景
        border: '1px solid #666', // 较浅的边框
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)', // 深色阴影
        zIndex: 1000,
        color: '#fff', // 白色字体
        width: '200px', // 固定宽度
      }}
      className="p-2 rounded-lg"
    >
      {/* 添加到下一首播放 */}
      <div
        className="p-2 hover:bg-gray-700 cursor-pointer"
        onClick={() => {
          player.addTrackToNext(track);
          handleCloseMenu();
        }}
      >
        添加到下一首播放
      </div>

      {/* 添加到...，显示子菜单 */}
      <div
        className="relative p-2 hover:bg-gray-700 cursor-pointer"
        onMouseEnter={() => setShowSubMenu(true)}  // 鼠标移入显示子菜单
        onMouseLeave={() => setShowSubMenu(false)} // 鼠标移出隐藏子菜单
      >
        添加到...
        {/* 子菜单 */}
        {showSubMenu && (
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '100%',
              backgroundColor: '#333', // 深色背景
              border: '1px solid #666',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
              zIndex: 1001,
              width: '200px',
            }}
            className="p-2 rounded-lg"
          >
            {/* 遍历所有的播放列表 */}
            {playlists.map((playlist) => (
              <div
                key={playlist.playlist_id}
                className="p-2 hover:bg-gray-700 cursor-pointer"
                onClick={() => {
                  if (playlist.playlist_id === 0) {
                    addToLibrary(track);
                  } else {
                    addTrackToPlaylist(track, playlist.playlist_id);
                  }
                  handleCloseMenu();
                }}
              >
                {playlist.title === 'Library' ? '库' : playlist.title}
              </div>
            ))}

          </div>
        )}
      </div>
    </div>
  );
}

export default ContextMenu;
