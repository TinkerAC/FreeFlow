// src/renderer/components/PlaylistView/PlaylistView.tsx
import React, { useEffect, useState } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
import ColorThief from 'colorthief';
import './PlaylistView.css';

import { Playlist } from '@components/Maincontent/PlaylistView/Playlist';
import ModalModifyPlaylist from '@components/Maincontent/PlaylistView/ModalModifyPlaylist';
import { DefaultCover } from '@components/static';
import { playlistContext } from '@renderer/core/electronContextApi';
import Player from '@renderer/core/player/Player';
import MusicLibraryController from '@renderer/core/MusicLibraryController';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

interface PlaylistViewProps {
  musicLibraryController: MusicLibraryController;
  player: Player;
}

export function PlaylistView({
                               musicLibraryController,
                               player,
                             }: PlaylistViewProps) {

  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity>(null);
  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(
      () => {
        setPresentPlaylist(musicLibraryController.activePlaylist);
      },
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const coverImage = presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;
  const [backgroundColor, setBackgroundColor] = useState('#333');
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(presentPlaylist?.tracks || []);
  const [searchKeyword, setSearchKeyword] = useState('');


  const openModalModifyPlaylist = () => {
    setModalVisible(true);
    console.log('打开修改歌单对话框');
  };

  const closeModalModifyPlaylist = () => {
    setModalVisible(false);
    console.log('关闭修改歌单对话框');
  };

  // 提取封面主色调
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = coverImage;

    img.onload = () => {
      const colorThief = new ColorThief();
      try {
        const result = colorThief.getColor(img);
        setBackgroundColor(`rgb(${result[0]}, ${result[1]}, ${result[2]})`);
      } catch (error) {
        console.error('无法提取主色调', error);
      }
    };

    img.onerror = () => {
      console.error('图片加载失败');
    };
  }, [coverImage]);

  // 当 playListInfo 变化时更新过滤后的歌曲列表
  useEffect(() => {
    setFilteredTracks(presentPlaylist?.tracks || []);
  }, [presentPlaylist]);

  //保存前端搜索关键词
  useEffect(() => {
    search(searchKeyword);
  }, [searchKeyword]);

  //实现了歌曲搜索功能
  const search = (keyword: string) => {
    if (!keyword) {
      setFilteredTracks(presentPlaylist?.tracks || []);
      return;
    }

    const lowerCaseKeyword = keyword.toLowerCase();

    const result = presentPlaylist?.tracks?.filter((track) => {
      // 获取歌曲的标题、艺术家和专辑名称
      const title = track.title || '';
      const artist = track.artist || '';
      const album = track.album || '';

      // 检查关键词是否匹配中文、拼音全拼或拼音首字母
      return (
        title.toLowerCase().includes(lowerCaseKeyword) ||
        artist.toLowerCase().includes(lowerCaseKeyword) ||
        album.toLowerCase().includes(lowerCaseKeyword)
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
            onClick={openModalModifyPlaylist}
          >
            {presentPlaylist?.title || '未知歌单'}
          </h1>
          <p className="mt-2 text-gray-400">
            {presentPlaylist?.creator || '未知创建者'} •{' '}
            {presentPlaylist?.tracks?.length || 0} 首歌曲
          </p>
        </div>
      </div>

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
        {/*是否已经被持久化(以红心显示), 未持久化的歌单可以添加到数据库*/}
        <button>
          {presentPlaylist?.is_persistent ? (
            <i className="fas fa-heart text-red-500 text-2xl ml-auto"
               onClick={() => {
                 playlistContext.removePlaylist(presentPlaylist?.playlist_id).then(() => {
                   musicLibraryController.refreshPlaylists();
                 });
               }}
            ></i>
          ) : (
            <i className="far fa-heart text-2xl ml-auto"
               onClick={() => {
                 playlistContext.addPlaylist(presentPlaylist).then(() => {
                     musicLibraryController.refreshPlaylists();
                   },
                 );
               }}
            ></i>
          )}
        </button>


        {/* 歌曲搜索框 */}
        <input
          type="text"
          placeholder="搜索歌曲"
          className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 ml-auto"
          onChange={(e) => setSearchKeyword(e.target.value)}
          onContextMenu={(e) => {
            e.preventDefault();
            setSearchKeyword('');
          }}
          value={searchKeyword}
        />
      </div>

      <Playlist
        filteredTracks={filteredTracks}
        player={player}
        musicLibraryController={musicLibraryController}
      />

      {modalVisible && (
        <ModalModifyPlaylist
          onClose={closeModalModifyPlaylist}
          musicLibraryController={musicLibraryController}
        />
      )}
    </div>
  );
}

export default PlaylistView;
