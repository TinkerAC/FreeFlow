import React from 'react';
import styles from './PlaylistTab.module.css';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { searchContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { Platform } from '@main/core/enum/Platform';

export default function PlaylistsTab({
                                       playlists, musicLibraryController,
                                     }: {
  playlists: PlaylistEntity[];
  musicLibraryController: MusicLibraryController;
}) {
  const navigation = useNavigation();
  if (!playlists?.length) return <div style={{ opacity: .7, padding: 16 }}>没有找到歌单。</div>;

  return (
    <div className={styles.grid}>
      {playlists.map((p) => (
        <div
          key={`${p.platform}_${p.platform_unique_id}`}
          className={styles.card}
          onClick={async () => {
            const id = p.platform_unique_id;
            if (p.platform === Platform.BILIBILI || p.platform === Platform.YOUTUBE_MUSIC) {
              musicLibraryController.activePlaylist = p;
            } else {
              musicLibraryController.activePlaylist = await searchContext.getPlaylistDetail(p.platform, id);
            }
            navigation.push(ViewType.PLAYLIST);
          }}
        >
          <div className={styles.coverWrapper}>
            <img src={p.playlist_cover || DefaultCover} alt={p.title} className={styles.cover} />
          </div>
          
          <div className={styles.info}>
            <div className={styles.title} title={p.title}>{p.title}</div>
            <div className={styles.desc} title={p.description}>{p.description || '暂无描述'}</div>
            
            <div className={styles.meta}>
              <PlatformIcon platform={p.platform} size={14} />
              <span>{p.platform}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
