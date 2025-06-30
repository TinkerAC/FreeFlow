// src/renderer/components/PlaylistView/PlaylistView.tsx
import React, { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import ColorThief from 'colorthief';
import './PlaylistView.css';

import { Playlist } from '@components/Maincontent/PlaylistView/Playlist';
import ModalModifyPlaylist from '@components/Maincontent/PlaylistView/ModalModifyPlaylist';
import { DefaultCover } from '@components/static';
import { playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

interface PlaylistViewProps {
  musicLibraryController: MusicLibraryController;
  player: PlayerController;
}

/** 全局内存缓存：key = `${platform}_${platuniqueid}` → value = 'rgb(r,g,b)' */
const themeColorCache: Record<string, string> = {};

export function PlaylistView({
                               musicLibraryController,
                               player,
                             }: PlaylistViewProps) {
  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity>(null);

  /* 订阅歌单变化 */
  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setPresentPlaylist(musicLibraryController.activePlaylist);
    });
    return () => unsubscribe();
  }, []);

  const coverImage = presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;
  const [backgroundColor, setBackgroundColor] = useState('#333');
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(
    presentPlaylist?.tracks || []
  );
  const [searchKeyword, setSearchKeyword] = useState('');

  /* 计算或读取主题色（纯内存缓存） */
  useEffect(() => {
    if (!presentPlaylist) return;

    const { platform,  platform_unique_id } = presentPlaylist;
    const cacheKey = `${platform}_${platform_unique_id}`;

    // 命中内存缓存
    if (themeColorCache[cacheKey]) {
      setBackgroundColor(themeColorCache[cacheKey]);
      return;
    }

    // 未命中时异步提取主色调
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = coverImage;

    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const [r, g, b] = colorThief.getColor(img);
        const rgb = `rgb(${r}, ${g}, ${b})`;

        // 写入缓存并更新 UI
        themeColorCache[cacheKey] = rgb;
        setBackgroundColor(rgb);
      } catch (e) {
        console.error('提取主色调失败：', e);
      }
    };

    img.onerror = () => console.error('封面图片加载失败：', img.src);
  }, [coverImage, presentPlaylist]);

  /* 歌单切换时刷新列表 */
  useEffect(() => {
    setFilteredTracks(presentPlaylist?.tracks || []);
  }, [presentPlaylist]);

  /* 根据关键词搜索 */
  useEffect(() => {
    search(searchKeyword);
  }, [searchKeyword]);

  const search = (keyword: string) => {
    if (!keyword) {
      setFilteredTracks(presentPlaylist?.tracks || []);
      return;
    }
    const lower = keyword.toLowerCase();
    const result = presentPlaylist?.tracks?.filter((t) => {
      const title = t.title || '';
      const artist = t.artist || '';
      const album = t.album || '';
      return (
        title.toLowerCase().includes(lower) ||
        artist.toLowerCase().includes(lower) ||
        album.toLowerCase().includes(lower)
      );
    });
    setFilteredTracks(result);
  };

  return (
    <div
      className="p-4 relative w-full h-full PlaylistView"
      style={{
        background: `linear-gradient(to bottom, ${backgroundColor}, #000)`,
        overflowY: 'auto',
      }}
    >
      {/* 头部区域 */}
      <div className="relative z-10 flex flex-col md:flex-row items-center mb-6">
        <img
          src={coverImage}
          alt="Playlist cover"
          className="w-48 h-48 rounded-lg object-cover"
        />
        <div className="ml-0 md:ml-6 mt-4 md:mt-0 text-center md:text-left">
          <h2 className="text-lg text-gray-300">歌单</h2>
          <h1
            className="text-4xl font-bold mt-2 cursor-pointer hover:underline"
            onClick={() => setModalVisible(true)}
          >
            {presentPlaylist?.title || '未知歌单'}
          </h1>
          <p className="mt-2 text-gray-400">
            {presentPlaylist?.creator || '未知创建者'} •{' '}
            {presentPlaylist?.tracks?.length || 0} 首歌曲
          </p>
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center relative z-10 mb-4">
        <button
          className="bg-green-500 p-4 rounded-full text-2xl mr-4 hover:bg-green-600 focus:outline-none"
          onClick={() => player.replacePlayQueue(presentPlaylist?.tracks || [])}
          aria-label="播放全部"
        >
          <i className="fas fa-play"></i>
        </button>
        <button
          className="text-2xl mr-4 hover:text-gray-300 focus:outline-none"
          aria-label="随机播放"
        >
          <i className="fas fa-random"></i>
        </button>
        <button
          className="text-2xl hover:text-gray-300 focus:outline-none"
          aria-label="下载歌单"
        >
          <i className="fas fa-download"></i>
        </button>

        {/* 收藏 / 取消收藏 */}
        <button>
          {presentPlaylist?.is_persistent ? (
            <i
              className="fas fa-heart text-red-500 text-2xl ml-auto"
              onClick={() =>
                playlistContext
                  .removePlaylist(presentPlaylist?.playlist_id)
                  .then(() => musicLibraryController.refreshPlaylists())
              }
            ></i>
          ) : (
            <i
              className="far fa-heart text-2xl ml-auto"
              onClick={() =>
                playlistContext
                  .addPlaylist(presentPlaylist)
                  .then(() => musicLibraryController.refreshPlaylists())
              }
            ></i>
          )}
        </button>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索歌曲"
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 ml-auto"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onContextMenu={(e) => {
            e.preventDefault();
            setSearchKeyword('');
          }}
        />
      </div>

      {/* 歌曲列表 */}
      <Playlist
        filteredTracks={filteredTracks}
        player={player}
        musicLibraryController={musicLibraryController}
      />

      {/* 修改歌单弹窗 */}
      {modalVisible && (
        <ModalModifyPlaylist
          onClose={() => setModalVisible(false)}
          musicLibraryController={musicLibraryController}
        />
      )}
    </div>
  );
}

export default PlaylistView;