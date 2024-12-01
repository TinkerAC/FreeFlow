import React from 'react';
import internal from 'node:stream';
import context from '@main/app/electronContextApi';

interface ContextMenuProps {

  x: number;
  y: number;
  handleCloseMenu: () => void;
  eventPlaylist: any;
  refreshPlaylist: () => void;

}

function ContextMenu({
                       x,
                       y,
                       handleCloseMenu,
                       eventPlaylist,
                       refreshPlaylist,

                     }: ContextMenuProps) {


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
          console.log(`前端正在删除歌单${eventPlaylist.playlist_id}`);
          context.removePlaylist(eventPlaylist.playlist_id, refreshPlaylist);
          handleCloseMenu();
        }}
      >
        删除歌单
      </div>
    </div>);

}

export default ContextMenu;
