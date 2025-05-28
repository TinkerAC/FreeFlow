// src/components/PlaylistView/ModalModifyPlaylist.jsx

import React, { useState } from 'react';
import { playlistContext } from '@renderer/core/electronContextApi';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';


interface ModalModifyPlaylistProps {
  onClose: () => void;
  musicLibraryController: MusicLibraryController;
}

const ModalModifyPlaylist = ({
                               onClose,
                               musicLibraryController,
                             }: ModalModifyPlaylistProps) => {


  const [title, setTitle] = useState(musicLibraryController.activePlaylist?.title || '');
  const [description, setDescription] = useState(musicLibraryController.activePlaylist?.description || '');

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();

    // 在这里处理保存逻辑，例如调用 API 更新歌单信息
    console.log('正在保存歌单信息:', { title, description });
    // 调用 API 更新歌单信息
    await playlistContext.modifyPlaylist(
      {
        playlist_id: musicLibraryController.activePlaylist?.playlist_id,
        title,
        description,
      },
    ).then(() => {
      musicLibraryController.refreshPlaylists();
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96 relative">
        {/* 关闭按钮 */}
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-white"
          onClick={onClose}
          aria-label="关闭"
        >
          <i className="fas fa-times"></i>
        </button>

        {/* 模态标题 */}
        <h2 className="text-2xl font-bold mb-4">编辑歌单</h2>

        {/* 表单 */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-400 mb-1">名称</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-400 mb-1">添加简介（可选）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500"
              rows={4}
            ></textarea>
          </div>
          <div className="text-center">
            <button
              type="submit"
              className="bg-white text-black py-2 px-6 rounded-full hover:bg-gray-200 focus:outline-none"
            >
              保存
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


export default ModalModifyPlaylist;
