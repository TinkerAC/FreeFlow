// file: src/renderer/components/MusicLibrary/MusicLibrary.tsx
import React, { useEffect, useState } from 'react';
import Item from './Item';
import ContextMenu from './ContextMenu';
import ContentPanel from '@components/ContentPanel/ContentPenal';
import { playlistContext } from '@main/app/electronContextApi';
import { PlaylistModel } from '@src/shared/domainModel/playlistModel';


interface MusicLibraryProps {
  className?: string;
  libraryItems: PlaylistModel[];
  selectedItem: number;
  onSelectItem: (index: number) => void;
  mainContentView: string;
  setMainContentView: (view: string) => void;
  isMusicLibraryCollapsed: boolean;
  onToggleMusicLibraryCollapsed: () => void;
  refreshPlaylist: () => void;
}

export default function MusicLibrary({
                                       libraryItems = [],
                                       selectedItem,
                                       onSelectItem,
                                       mainContentView,
                                       setMainContentView,
                                       isMusicLibraryCollapsed,
                                       onToggleMusicLibraryCollapsed,
                                       refreshPlaylist,
                                     }: MusicLibraryProps) {
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [eventPlaylist, setEventPlaylist] = useState<PlaylistModel | null>(null);

  const handleSelectItem = (index: number) => {
    if (mainContentView !== 'playlist') {
      setMainContentView('playlist');
    }
    onSelectItem(index);
  };

  const handleRightClick = (
    e: { preventDefault: () => void; clientX: number; clientY: number },
    playlist_id: number,
  ) => {
    e.preventDefault();
    setEventPlaylist(libraryItems.find(item => item.playlist_id === playlist_id) || null);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };

  const handleCloseMenu = () => {
    setContextMenuVisible(false);
    setEventPlaylist(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuVisible) {
        handleCloseMenu();
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenuVisible]);

  if (isMusicLibraryCollapsed) {
    // 折叠状态下：头部固定，列表区域滚动
    return (
      <ContentPanel className="w-full flex flex-col">
        {/* 固定头部 */}
        <div className="flex items-center w-full p-6">
          <i
            className="fas fa-bars cursor-pointer text-2xl"
            onClick={onToggleMusicLibraryCollapsed}
          ></i>
        </div>
        {/* 歌单列表滚动区域 */}
        <div className="flex-1 flex justify-start items-center flex-col overflow-y-auto no-scrollbar">
          {libraryItems.map((item, index) => (
            <div
              key={item.playlist_id}
              className="w-[4rem] h-[4rem] flex justify-center items-center rounded-lg hover:bg-item-bg-hover"
            >
              <img
                src={item?.tracks?.[0]?.cover_src || '../assets/default-playlistContext-cover.png'}
                alt={`${item.title} key:${item.playlist_id}`}
                className="w-12 h-12 m-1 rounded-md cursor-pointer"
                onClick={() => handleSelectItem(index)}
              />
            </div>
          ))}
        </div>
      </ContentPanel>
    );
  } else {
    // 展开状态下：头部固定，列表区域滚动
    return (
      <ContentPanel className="w-full flex flex-col h-full">
        {/* 固定头部区域 */}
        <div className="p-6">
          <div className="flex items-center">
            <i
              className="fas fa-bars cursor-pointer text-2xl"
              onClick={onToggleMusicLibraryCollapsed}
            ></i>
            <h1 className="ml-2 text-lg whitespace-nowrap">音乐库</h1>
            <div className="ml-auto flex items-center">
              <i
                className="fas fa-plus text-xl cursor-pointer"
                onClick={() => playlistContext.createPlaylist().then(refreshPlaylist)}
              ></i>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex mb-4">
              <button className="bg-gray-700 text-white px-4 py-1 rounded-full mr-2 whitespace-nowrap">
                歌单
              </button>
              <button className="bg-gray-700 text-white px-4 py-1 rounded-full whitespace-nowrap">
                专辑
              </button>
            </div>
            <div className="flex items-center">
              <i className="fas fa-search text-xl"></i>
              <span className="ml-auto whitespace-nowrap">
                最近播放 <i className="fas fa-list text-xl"></i>
              </span>
            </div>
          </div>
        </div>
        {/* 歌单列表滚动区域 */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 no-scrollbar">
          <div className="flex flex-col gap-2">
            {libraryItems && libraryItems.length !== 0 ? (
              libraryItems.map((item, index) => (
                <Item
                  key={item.playlist_id}
                  imgSrc={item?.tracks?.[0]?.cover_src || '../assets/default-playlistContext-cover.png'}
                  altText={`${item.title} key:${item.playlist_id}`}
                  title={item.title}
                  description={item.description}
                  index={index}
                  isSelected={selectedItem === index}
                  onClick={() => handleSelectItem(index)}
                  onRightClick={(e: { preventDefault: () => void; clientX: number; clientY: number }) =>
                    handleRightClick(e, item.playlist_id)
                  }
                />
              ))
            ) : (
              <div className="text-center text-gray-400">暂无歌单</div>
            )}
          </div>
        </div>
        {contextMenuVisible && (
          <ContextMenu
            x={contextMenuPosition.x}
            y={contextMenuPosition.y}
            eventPlaylist={eventPlaylist}
            handleCloseMenu={handleCloseMenu}
            refreshPlaylist={refreshPlaylist}
          />
        )}
      </ContentPanel>
    );
  }
}