// src/renderer/components/SearchResultView/contextMenu.tsx
import React, { useState } from 'react';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import Player from '@renderer/core/player/Player';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

interface ContextMenuProps {
  x: number,
  y: number,
  track: TrackEntity,
  player: Player;
  handleCloseMenu: () => void,
  playlists: PlaylistEntity[],
  currentPlaylist: PlaylistEntity,
  refreshPlaylists?: () => void
}

function ContextMenu({
                       x,
                       y,
                       track,
                       handleCloseMenu,
                       playlists,
                       currentPlaylist,
                       refreshPlaylists,
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
        border: '1px solid #666', // 边框为浅灰色
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)', // 深色阴影
        zIndex: 1000,
        color: '#fff', // 白色字体
        width: '200px', // 固定宽度
        borderRadius: '8px', // 圆角
      }}
      className="p-2"
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
              backgroundColor: '#333', // 子菜单也采用深灰色背景
              border: '1px solid #666',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
              zIndex: 1001,
              width: '200px',
              borderRadius: '8px',
            }}
            className="p-2"
          >
            {/* 遍历所有的播放列表 */}
            {playlists
              .filter((playlist) => playlist.playlist_id !== currentPlaylist.playlist_id && playlist.playlist_id !== 0)
              .map((playlist) => (
                <div
                  key={playlist.playlist_id}
                  className="p-2 hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    if (playlist.playlist_id === 0) {
                      libraryContext.addTrackToLibrary(track).then(refreshPlaylists);
                    } else {
                      playlistContext.addTrackToPlaylist(track, playlist.playlist_id).then(refreshPlaylists);
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


      {/* 从当前播放列表中移除 */}
      <div
        className="p-2 hover:bg-gray-700 cursor-pointer"
        onClick={async () => {
          switch (currentPlaylist?.playlist_id) {
            case 0:
              await libraryContext.removeTrackFromLibrary(track).then(refreshPlaylists);
              break;
            default:
              await libraryContext.removeTrackFromLibrary(track).then(refreshPlaylists);
              break;
          }
        }}>
        从{currentPlaylist?.title}中移除
      </div>

      <div
        className="p-2 hover:bg-gray-700 cursor-pointer"
        onClick={async () => {
          await libraryContext.downFromHifini(track);
        }}>
        下载
      </div>

    </div>
  );
}

export default ContextMenu;
