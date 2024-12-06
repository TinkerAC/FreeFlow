import React, { useState } from 'react';
import context from '@main/app/electronContextApi';
import { PlaylistModel, TrackModel } from '@src/shared/types';

interface ContextMenuProps {
  x: number;
  y: number;
  track: TrackModel;
  addToNext: (track: TrackModel) => void;
  addToLibrary: (track: TrackModel) => void;
  handleCloseMenu: () => void;
  addTrackToPlaylist: (track: TrackModel, playlistId: number) => void;
  playlists: PlaylistModel[];
  currentPlaylist: PlaylistModel;
  refreshPlaylists: () => void;
}


function ContextMenu({
                       x,
                       y,
                       track,
                       addToNext,
                       addToLibrary,
                       handleCloseMenu,
                       addTrackToPlaylist,
                       playlists,
                       currentPlaylist,
                       refreshPlaylists,
                     }: ContextMenuProps) {
  const [playlistSubMenuVisible, setPlaylistSubMenuVisible] = useState(false);

  if (!track) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        backgroundColor: '#333', // 统一为深灰色背景
        border: '1px solid #666', // 边框为浅灰色
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.2)',
        zIndex: 1000,
        color: '#fff', // 白色字体
        width: '200px', // 菜单宽度统一
      }}
      className="p-2"
    >
      {/* 添加到下一首播放 */}
      <div
        className="p-2 hover:bg-gray-700 cursor-pointer"
        style={{ color: '#fff' }}
        onClick={() => {
          addToNext(track);
          handleCloseMenu();
        }}
      >
        添加到下一首播放
      </div>

      {/* 添加到...，显示子菜单 */}
      <div
        className="relative p-2 hover:bg-gray-700 cursor-pointer"
        style={{ color: '#fff' }}
        onMouseEnter={() => setPlaylistSubMenuVisible(true)}
        onMouseLeave={() => setPlaylistSubMenuVisible(false)}
      >
        添加到...
        {/* 子菜单 */}
        {playlistSubMenuVisible && (
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
              color: '#fff',
            }}
            className="p-2"
          >
            {/* 遍历所有的播放列表 */}
            {playlists.map((playlist) => (
              <div
                key={playlist.playlist_id}
                className="p-2 hover:bg-gray-700 cursor-pointer"
                style={{ color: '#fff' }}
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

      {/* 从当前歌单中删除 */}
      <div
        className="p-2 hover:bg-gray-700 cursor-pointer"
        style={{ color: '#fff' }}
        onClick={() => {
          console.log(`从${currentPlaylist.title}中删除歌曲${track.title}`);
          context.removeTrackFromPlaylist(currentPlaylist.playlist_id, track.track_id, refreshPlaylists);
          handleCloseMenu();
        }}
      >
        从当前歌单中删除
      </div>
    </div>
  );
}

export default ContextMenu;
