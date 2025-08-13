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
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';

interface PlaylistViewProps {
  musicLibraryController: MusicLibraryController;
  player: PlayerController;
}

/** 全局内存缓存：key = `${platform}_${platuniqueid}` → value = 'r g b'（三通道） */
const themeColorCache: Record<string, string> = {};

export default function PlaylistView({ musicLibraryController, player }: PlaylistViewProps) {
  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity | null>(null);

  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setPresentPlaylist(musicLibraryController.activePlaylist);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  const coverImage = presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;

  // 用 "r g b" 三通道字符串，便于注入 CSS var
  const [accentRGB, setAccentRGB] = useState<string>('51 51 51');
  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(presentPlaylist?.tracks || []);
  const [searchKeyword, setSearchKeyword] = useState('');

  /* 主色提取（带内存缓存） */
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
        const triplet = `${r} ${g} ${b}`;
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

  /* 关键字搜索 */
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

  /** 唯一滚动容器：来自 ViewShell（forwardRef） */
  const scrollRef = useRef<HTMLDivElement>(null);

  /* 头部区（不滚动） */
  const header = (
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
  );

  return (
    <ViewShell ref={scrollRef} header={header} padded hideScrollbar>
      {/* 主体内容放在滚动容器中；仅负责排版，不设置 overflow */}
      <div className={styles.body} style={{ ['--accent' as any]: accentRGB }}>
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
            onContextMenu={(e) => {
              e.preventDefault();
              setSearchKeyword('');
            }}
          />
        </div>

        {/* 歌曲列表（把 ViewShell 的滚动容器 ref 传下去） */}
        <Playlist
          filteredTracks={filteredTracks}
          player={player}
          musicLibraryController={musicLibraryController}
          scrollContainerRef={scrollRef}
        />

        {/* 修改歌单弹窗 */}
        {modalVisible && (
          <ModalModifyPlaylist
            onClose={() => setModalVisible(false)}
            musicLibraryController={musicLibraryController}
          />
        )}
      </div>
    </ViewShell>
  );
}