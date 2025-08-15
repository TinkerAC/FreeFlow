import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './PlaylistView.module.css';

import { Playlist } from '@components/Maincontent/PlaylistView/Playlist';
import ModalModifyPlaylist from '@components/Maincontent/PlaylistView/ModalModifyPlaylist';
import { DefaultCover } from '@components/static';
import { playlistContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';

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
  const [presentPlaylist, setPresentPlaylist] = useState<PlaylistEntity | null>(null);

  useEffect(() => {
    const unsubscribe = musicLibraryController.subscribe(() => {
      setPresentPlaylist(musicLibraryController.activePlaylist);
    });
    return () => unsubscribe();
  }, [musicLibraryController]);

  const coverImage = presentPlaylist?.tracks?.[0]?.cover_src || DefaultCover;

  const [modalVisible, setModalVisible] = useState(false);
  const [filteredTracks, setFilteredTracks] = useState(presentPlaylist?.tracks || []);
  const [searchKeyword, setSearchKeyword] = useState('');

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

  /** ViewShell 的滚动容器 */
  const scrollRef = useRef<HTMLDivElement>(null);

  /** 简洁头显隐（完整头滚出阈值后淡入；回到顶部淡出） */
  const [compactTarget, setCompactTarget] = useState(false);   // 期望状态（来自 IO）
  const [compactMounted, setCompactMounted] = useState(false); // 是否渲染到 DOM
  const [compactShown, setCompactShown] = useState(false);     // 是否展示（用于过渡）
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
    setCompactTarget(r < 0.15);
      },
      {
        root,                // 在 ViewShell 的滚动容器内观察
        threshold: [0, .05, .1, .15, .2, .5, 1],
      },
    );

    io.observe(target);
    return () => io.disconnect();
  }, [presentPlaylist]);

  // 控制挂载/过渡：进入时先挂载再开 show；离开时先关 show，再延时卸载
  useEffect(() => {
    let timer: number | undefined;
    if (compactTarget) {
      if (!compactMounted) {
        setCompactMounted(true);
        // 下一帧再设置展示，触发过渡
        requestAnimationFrame(() => setCompactShown(true));
      } else {
        setCompactShown(true);
      }
    } else {
      if (compactMounted) {
        setCompactShown(false);
        timer = window.setTimeout(() => setCompactMounted(false), 260); // 匹配 CSS 过渡时长
      }
    }
    return () => { if (timer) window.clearTimeout(timer); };
  }, [compactTarget, compactMounted]);

  // 简洁头上的类型标签
  const compactKicker = (presentPlaylist as any)?.type === 'album' ? '专辑' : '歌单';

  return (
    // 背景放入 ViewShell 的独立层：不随内容滚动，仍受圆角裁剪
    <ViewShell
      ref={scrollRef}
      padded={false}
      hideScrollbar
      background={<div className={styles.backdrop} style={{ ['--cover' as any]: `url("${coverImage}")` }} />}
    >
      {/* 内容区域 */}
      <div className={styles.wrap}>

        {/* 粘顶的简洁头（封面更大 + 顶部有“歌单/专辑”标签） */}
        {compactMounted && (
          <div className={styles.headerCompact} data-show={compactShown ? 'true' : 'false'}>
            <div className={styles.headerCompactInner}>
              <img src={coverImage} alt="" className={styles.compactThumb} />
              <div className={styles.compactText}>
                <div className={styles.compactKicker}>{compactKicker}</div>
                <TtlMarquee text={presentPlaylist?.title || '未知歌单'} />
              </div>
              <div className={styles.compactActions}>
                <button
                  className={styles.playBtn}
                  onClick={() => player.replacePlayQueue(presentPlaylist?.tracks || [])}
                  title="播放全部"
                  aria-label="播放全部"
                >
                  <i className="fas fa-play" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ 完整头吸到容器顶部：紧贴上边，不留额外空隙 */}
        <div className={styles.headerFull} ref={fullRef}>
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

        {/* 主体内容（与完整头紧密相接） */}
        <div className={styles.body}>
          <div className={styles.actions}>
            <button
              className={styles.playBtn}
              onClick={() => player.replacePlayQueue(presentPlaylist?.tracks || [])}
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

          <Playlist
            filteredTracks={filteredTracks}
            player={player}
            musicLibraryController={musicLibraryController}
            scrollContainerRef={scrollRef}
          />

          {modalVisible && (
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