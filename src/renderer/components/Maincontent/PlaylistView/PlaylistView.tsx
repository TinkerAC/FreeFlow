import React, { useEffect, useRef, useState } from 'react';
import ColorThief from 'colorthief';
import styles from './PlaylistView.module.css';

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

/** 全局内存缓存：key = `${platform}_${platuniqueid}` → value = 'r g b'（三通道） */
const themeColorCache: Record<string, string> = {};

export function PlaylistView({ musicLibraryController, player }: PlaylistViewProps) {
  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity | null>(null);

  /* 订阅歌单变化 */
  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setPresentPlaylist(musicLibraryController.activePlaylist);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  const coverImage = presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;

  // 注意：这里用 "r g b" 存储，便于直接塞进 CSS var
  const [accentRGB, setAccentRGB] = useState<string>('51 51 51'); // 默认 #333 => 51 51 51
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(presentPlaylist?.tracks || []);
  const [searchKeyword, setSearchKeyword] = useState('');

  /* 计算或读取主题色 */
  useEffect(() => {
    if (!presentPlaylist) return;
    const { platform, platform_unique_id } = presentPlaylist;
    const cacheKey = `${platform}_${platform_unique_id}`;

    if (themeColorCache[cacheKey]) {
      setAccentRGB(themeColorCache[cacheKey]);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = coverImage;
    img.onload = () => {
      try {
        const colorThief = new ColorThief();
        const [r, g, b] = colorThief.getColor(img);
        const triplet = `${r} ${g} ${b}`;           // ★ 三通道字符串
        themeColorCache[cacheKey] = triplet;
        setAccentRGB(triplet);
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
    if (!searchKeyword) {
      setFilteredTracks(presentPlaylist?.tracks || []);
      return;
    }
    const lower = searchKeyword.toLowerCase();
    setFilteredTracks(
      (presentPlaylist?.tracks || []).filter((t) =>
        (t.title || '').toLowerCase().includes(lower) ||
        (t.artist || '').toLowerCase().includes(lower) ||
        (t.album || '').toLowerCase().includes(lower),
      ),
    );
  }, [searchKeyword, presentPlaylist]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollContainerRef}
      className={styles.root}
      style={{ ['--accent' as any]: accentRGB }}  // ★ 仅设置背景用的主色，不影响文字颜色
    >
      {/* 头部 */}
      <div className={styles.header}>
        <img src={coverImage} alt="Playlist cover" className={styles.cover} />
        <div className={styles.meta}>
          <div className={styles.kicker}>歌单</div>
          <h1 className={styles.title} onClick={() => setModalVisible(true)}>
            {presentPlaylist?.title || '未知歌单'}
          </h1>
          <p className={styles.sub}>
            {presentPlaylist?.creator || '未知创建者'} • {(presentPlaylist?.tracks?.length || 0)} 首歌曲
          </p>
        </div>
      </div>

      {/* 操作栏 */}
      <div className={styles.actions}>
        <button
          className="bg-green-500 p-4 rounded-full text-2xl hover:bg-green-600 focus:outline-none"
          onClick={() => player.replacePlayQueue(presentPlaylist?.tracks || [])}
          aria-label="播放全部"
          title="播放全部"
        >
          <i className="fas fa-play" />
        </button>
        <button className="text-2xl hover:text-gray-300 focus:outline-none" aria-label="随机播放">
          <i className="fas fa-random" />
        </button>
        <button className="text-2xl hover:text-gray-300 focus:outline-none" aria-label="下载歌单">
          <i className="fas fa-download" />
        </button>

        {/* 收藏 / 取消收藏 */}
        <button className="text-2xl">
          {presentPlaylist?.is_persistent ? (
            <i
              className="fas fa-heart text-red-500"
              onClick={() =>
                playlistContext.removePlaylist(presentPlaylist?.playlist_id)
                  .then(() => musicLibraryController.refreshPlaylists())
              }
            />
          ) : (
            <i
              className="far fa-heart"
              onClick={() =>
                playlistContext.addPlaylist(presentPlaylist!)
                  .then(() => musicLibraryController.refreshPlaylists())
              }
            />
          )}
        </button>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索歌曲"
          className={`bg-gray-700 text-white p-2 rounded border border-gray-600 focus:outline-none focus:border-blue-500 ${styles.pushRight}`}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          onContextMenu={(e) => { e.preventDefault(); setSearchKeyword(''); }}
        />
      </div>

      {/* 歌曲列表 */}
      <Playlist
        filteredTracks={filteredTracks}
        player={player}
        musicLibraryController={musicLibraryController}
        scrollContainerRef={scrollContainerRef}
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
