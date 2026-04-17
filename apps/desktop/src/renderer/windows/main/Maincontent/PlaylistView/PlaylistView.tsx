import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './PlaylistView.module.css';

import { Playlist } from '@renderer/windows/main/Maincontent/PlaylistView/Playlist';
import ModalModifyPlaylist from '@renderer/windows/main/Maincontent/PlaylistView/ModalModifyPlaylist';
import { DefaultCover, Local } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import { isChainLibraryPlaylist } from '@renderer/core/freeflow/chainLibrary';

// 仅在文本溢出时跑马灯
function TtlMarquee({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [need, setNeed] = useState(false);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const check = () => setNeed(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);
  return (
    <div className={styles.ttlBox} ref={boxRef} title={text}>
      <div className={need ? styles.ttlMarquee : styles.ttlStatic}>{text}</div>
    </div>
  );
}

interface PlaylistViewProps {
  musicLibraryController: MusicLibraryController;
  player: PlayerController;
}

export default function PlaylistView({ musicLibraryController, player }: PlaylistViewProps) {
  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity | null>(
    musicLibraryController.activePlaylist,
  );

  useEffect(() => {
    // 初始化时设置当前歌单
    setPresentPlaylist(musicLibraryController.activePlaylist);

    const unsubscribe = musicLibraryController.subscribe(() => {
      setPresentPlaylist(musicLibraryController.activePlaylist);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  // 优先使用数据库中的 playlist_cover，如果没有则使用第一首歌曲的封面
  const coverImage = presentPlaylist?.playlist_cover || presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;
  const isOnchainLibrary = isChainLibraryPlaylist(presentPlaylist);
  const playbackTracks = presentPlaylist?.tracks || [];

  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(presentPlaylist?.tracks || []);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'artist' | 'date-added' | 'date-added-desc'>('default');

  /* 歌单切换时刷新列表 */
  useEffect(() => {
    applySortAndFilter();
  }, [presentPlaylist, sortBy, searchKeyword]);

  const applySortAndFilter = () => {
    let tracks = presentPlaylist?.tracks || [];

    // 先过滤
    if (searchKeyword) {
      const lower = searchKeyword.toLowerCase();
      tracks = tracks.filter((t) =>
        (t.title || '').toLowerCase().includes(lower) ||
        (t.artist || '').toLowerCase().includes(lower) ||
        (t.album || '').toLowerCase().includes(lower),
      );
    }

    // 再排序
    let sorted = [...tracks];
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'artist':
        sorted.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
        break;
      case 'date-added':
        sorted.sort((a, b) => (a.created_at?.getTime() || 0) - (b.created_at?.getTime() || 0));
        break;
      case 'date-added-desc':
        sorted.sort((a, b) => (b.created_at?.getTime() || 0) - (a.created_at?.getTime() || 0));
        break;
      case 'default':
      default:
        // 保持原有顺序（按数据库position字段排序）
        break;
    }

    setFilteredTracks(sorted);
  };

  const handleSortChange = async (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy);

    // 如果选择默认排序，保存当前顺序到数据库
    if (newSortBy === 'default' && presentPlaylist?.playlist_id && presentPlaylist.playlist_id > 0) {
      const updates = filteredTracks.map((track, index) => ({
        track_id: track.id!,
        position: index,
      }));

      try {
        await playlistContext.updateTrackPositions(presentPlaylist.playlist_id, updates);
        await musicLibraryController.refreshPlaylists();
      } catch (error) {
        console.error('Failed to save track positions:', error);
      }
    }
  };

  /** ViewShell 的滚动容器 */
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 简洁头显隐（完整头滚出阈值后淡入；回到顶部淡出） */
  const [showCompact, setShowCompact] = useState(false);
  const fullRef = useRef<HTMLDivElement>(null);
  const fullHRef = useRef<number>(0);

  useLayoutEffect(() => {
    const m = () => {
      const h = fullRef.current?.getBoundingClientRect().height ?? 0;
      fullHRef.current = h;
    };
    m();
    const ro = new ResizeObserver(m);
    if (fullRef.current) ro.observe(fullRef.current);
    window.addEventListener('resize', m);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', m);
    };
  }, [presentPlaylist]);

  // 简洁头：基于 IntersectionObserver，不依赖滚动事件
  useEffect(() => {
    const root = scrollRef.current;
    const target = fullRef.current;
    if (!root || !target) return;

    // 可根据需要微调阈值；小于 0.15 认为“完整头基本滚没了”
    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio ?? 0;
        setShowCompact(r < 0.15);
      },
      {
        root,                // 在 ViewShell 的滚动容器内观察
        threshold: [0, .05, .1, .15, .2, .5, 1],
      },
    );

    io.observe(target);
    return () => io.disconnect();
  }, [presentPlaylist]);

  // 简洁头上的"平台"标签，使用图标
  function PlatformIconWrapper({ platform }: { platform?: string }) {
    if (platform === 'Local') {
      return <img src={Local} alt={platform} style={{ width: 16, height: 16, objectFit: 'contain' }} />;
    }
    if (!platform) return null;
    return <PlatformIcon platform={platform} size={16} />;
  }

  return (
    <ViewShell ref={scrollRef} padded hideScrollbar>
      {/* 粘顶的简洁头（放在滚动容器最前，保证始终从顶部淡入/淡出） */}
      <div className={styles.headerCompact} data-show={showCompact ? 'true' : 'false'}>
        <div className={styles.headerCompactInner}>
          <img src={coverImage} alt="" className={styles.compactThumb} />
          <div className={styles.compactText}>
            <div className={styles.compactKicker} title="平台">
              平台
              <span style={{ display: 'inline-flex', marginLeft: 6, verticalAlign: 'middle' }}>
                <PlatformIconWrapper platform={presentPlaylist?.platform as any} />
              </span>
            </div>
            <TtlMarquee text={presentPlaylist?.title || '未知歌单'} />
          </div>
          <div className={styles.compactActions}>
            <button
              className={styles.playBtn}
              onClick={() => player.replacePlayQueue(playbackTracks)}
              title="播放全部"
              aria-label="播放全部"
            >
              <i className="fas fa-play" />
            </button>
          </div>
        </div>
      </div>

      {/* 用 wrap 承载圆角与裁剪，backdrop 会被裁剪 */}
      <div className={styles.wrap}>
        {/* 背景：封面模糊（opacity 降低，便于看清模糊效果），受圆角裁剪且不随滚动 */}
        <div className={styles.backdrop} style={{ ['--cover' as any]: `url("${coverImage}")` }} />

        {/* ✅ 完整头吸到容器顶部：紧贴上边，不留额外空隙 */}
        <div className={styles.headerFull} ref={fullRef}>
          <img src={coverImage} alt="Playlist cover" className={styles.cover} />
          <div className={styles.meta}>
            <div className={styles.kicker} title="平台">
              平台
              <span style={{ display: 'inline-flex', marginLeft: 8, verticalAlign: 'middle' }}>
                <PlatformIconWrapper platform={presentPlaylist?.platform as any} />
              </span>
            </div>
            <h1 className={styles.title} onClick={() => !isOnchainLibrary && setModalVisible(true)}>
              {isOnchainLibrary ? '链上音乐库' : (presentPlaylist?.title || '未知歌单')}
            </h1>
            <p className={styles.sub}>
              {(isOnchainLibrary ? 'FreeFlow' : (presentPlaylist?.creator || '未知创建者'))}
              {' '}• {playbackTracks.length} 首歌曲
            </p>
          </div>
        </div>

        {/* 主体内容（与完整头紧密相接） */}
        <div className={styles.body}>
          <div className={styles.actions}>
            <button
              className={styles.playBtn}
              onClick={() => player.replacePlayQueue(playbackTracks)}
              aria-label="播放全部"
              title="播放全部"
            >
              <i className="fas fa-play" />
            </button>
            <button className={styles.iconGhost} aria-label="随机播放" title="随机播放">
              <i className="fas fa-random" />
            </button>
            <button className={styles.iconGhost} aria-label="下载歌单" title="下载歌单">
              <i className="fas fa-download" />
            </button>

            {/* 收藏 / 取消收藏 */}
            {!isOnchainLibrary && (
              <button className={styles.iconGhost} title="收藏/取消收藏">
                {presentPlaylist?.is_persistent ? (
                  <i
                    className="fas fa-heart"
                    style={{ color: 'rgb(var(--md-sys-color-error))' }}
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
            )}

            {/* 排序选择器 */}
            <select
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
              title="排序方式"
            >
              <option value="default">默认排序</option>
              <option value="title">按标题</option>
              <option value="artist">按艺术家</option>
              <option value="date-added">添加日期↑</option>
              <option value="date-added-desc">添加日期↓</option>
            </select>

            {/* 搜索框 */}
            <input
              type="text"
              placeholder="搜索歌曲"
              className={styles.search}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onContextMenu={(e) => {
                e.preventDefault();
                setSearchKeyword('');
              }}
            />
          </div>

          <div className={styles.list}>
            <Playlist
              filteredTracks={filteredTracks}
              player={player}
              musicLibraryController={musicLibraryController}
              scrollContainerRef={scrollRef}
            />
          </div>

          {!isOnchainLibrary && modalVisible && (
            <ModalModifyPlaylist
              onClose={() => setModalVisible(false)}
              musicLibraryController={musicLibraryController}
            />
          )}
        </div>
      </div>
    </ViewShell>
  );
}
