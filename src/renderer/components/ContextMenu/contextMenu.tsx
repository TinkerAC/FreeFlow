import React, { useState } from 'react';

interface Track {
  track_id: number;
  artist: string;
  cover_src: string;
  data_href: string;
  file_path: string;
  title: string;
}

interface Playlist {
  playlist_id: number;
  title: string;
}


interface ContextMenuProps {
  x: number;
  y: number;
  track: Track;
  addToNext: (track: Track) => void;
  addToLibrary: (track: Track) => void;
  handleCloseMenu: () => void;
  addTrackToPlaylist: (track: Track, playlistId: number) => void;
  playlists: Playlist[];
}





function ContextMenu(
  {
    x,
    y,
    track,
    addToNext,
    addToLibrary,
    handleCloseMenu,
    addTrackToPlaylist,
    playlists,
  }: ContextMenuProps,
) {

  const [showSubMenu, setShowSubMenu] = useState(false); // 控制是否显示子菜单

  if (!track) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        backgroundColor: 'white',
        border: '1px solid #ccc',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
      }}
      className="p-2"
    >
      {/* 添加到下一首播放 */}
      <div
        className="p-2 hover:bg-gray-100 cursor-pointer text-blue-500"
        onClick={() => {
          addToNext(track);
          handleCloseMenu();
        }}
      >
        添加到下一首播放
      </div>

      {/* 添加到...，显示子菜单 */}
      <div
        className="relative p-2 hover:bg-gray-100 cursor-pointer text-green-500"
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
              backgroundColor: 'white',
              border: '1px solid #ccc',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
              zIndex: 1001,
              width: '200px',
            }}
            className="p-2"
          >
            {/* 遍历所有的播放列表 */}
            {playlists.map((playlist) => (
              <div
                key={playlist.playlist_id}
                className="p-2 hover:bg-gray-100 cursor-pointer"
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
