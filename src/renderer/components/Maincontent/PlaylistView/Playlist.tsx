import React, { useEffect, useState } from 'react';
import ContextMenu from './ContextMenu';
import Track from '@components/Maincontent/PlaylistView/Track';
import PlayerController from '@renderer/core/controller/PlayerController';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import styles from './PlaylistView.module.css';

interface PlaylistProps {
  filteredTracks: TrackEntity[];
  player: PlayerController;
  musicLibraryController: MusicLibraryController;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function Playlist({
                           filteredTracks, player, musicLibraryController, scrollContainerRef,
                         }: PlaylistProps) {
  const [showFloatingButtons, setShowFloatingButtons] = useState(false);
  const [menu, setMenu] = useState<{ visible: boolean; x: number; y: number; track: TrackEntity | null }>({
    visible: false, x: 0, y: 0, track: null,
  });

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => setShowFloatingButtons(el.scrollTop > 200);
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [scrollContainerRef]);

  // 定位当前播放曲目（只在当前视图里滚）
  const locatePlayingTrack = () => {
    const ct = player.playQueue.currentTrack;
    if (!ct) return;
    const row = document.getElementById(`track-${ct.id}`);
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // 可选：在 Track 里根据 props 做高亮，这里先保持简洁
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onRightClick = (e: React.MouseEvent, track: TrackEntity) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,   // 直接用 client 坐标，与 ContextMenu 的 fixed 一致
      y: e.clientY,
      track,
    });
  };

  useEffect(() => {
    const close = () => setMenu(m => ({ ...m, visible: false, track: null }));
    if (!menu.visible) return;
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu.visible]);

  return (
    <div className="mt-6 Playlist">
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colIndex} />
          <col className={styles.colTitle} />
          <col className={`hidden md:table-cell ${styles.colAlbum}`} />
          <col className={`hidden lg:table-cell ${styles.colDate}`} />
          <col className={styles.colDur} />
        </colgroup>
        <thead>
        <tr>
          <th className={styles.colIndex}>#</th>
          <th className={styles.colTitle}>标题</th>
          <th className={`hidden md:table-cell ${styles.colAlbum}`}>专辑</th>
          <th className={`hidden lg:table-cell ${styles.colDate}`}>添加日期</th>
          <th className={styles.colDur}><i className="fas fa-clock" aria-label="时长" /></th>
        </tr>
        </thead>
        <tbody>
        {filteredTracks.length ? (
          filteredTracks.map((track, index) => (
            <Track
              key={track.id}
              track={track}
              index={index}
              player={player}
              onRightClick={(e) => onRightClick(e, track)}
            />
          ))
        ) : (
          <tr>
            <td colSpan={5} style={{
              textAlign: 'center',
              padding: '16px 0',
              color: 'rgb(var(--md-sys-color-on-surface-variant))',
            }}>
              无曲目可显示
            </td>
          </tr>
        )}
        </tbody>
      </table>

      {/* 浮动按钮 */}
      {showFloatingButtons && (
        <div className="fixed bottom-24 right-8 z-50 flex flex-col items-center">
          <button
            className="w-12 h-12 mb-3 flex items-center justify-center rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none"
            style={{ background: 'rgb(var(--md-sys-color-primary))', color: 'rgb(var(--md-sys-color-on-primary))' }}
            onClick={locatePlayingTrack}
            aria-label="定位到正在播放的曲目"
            title="定位到正在播放的曲目"
          >
            <i className="fas fa-music"></i>
          </button>
          <button
            className="w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-transform transform hover:scale-110 focus:outline-none"
            style={{
              background: 'rgb(var(--md-sys-color-surface-container-high))',
              color: 'rgb(var(--md-sys-color-on-surface))',
              border: '1px solid rgb(var(--md-sys-color-outline-variant))',
            }}
            onClick={scrollToTop}
            aria-label="返回顶部"
            title="返回顶部"
          >
            <i className="fas fa-arrow-up"></i>
          </button>
        </div>
      )}

      {/* 右键菜单 */}
      {menu.visible && menu.track && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          track={menu.track}
          handleCloseMenu={() => setMenu({ visible: false, x: 0, y: 0, track: null })}
          player={player}
          musicLibraryController={musicLibraryController}
        />
      )}
    </div>
  );
}