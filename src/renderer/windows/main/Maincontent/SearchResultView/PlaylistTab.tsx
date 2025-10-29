import React from 'react';
import styles from './ListRow.module.css';
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
  if (!playlists?.length) return <div style={{ opacity: .7 }}>没有找到歌单。</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {playlists.map((p) => (
        <div
          key={`${p.platform}_${p.platform_unique_id}`}
          className={styles.row}
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
          <img src={p.playlist_cover || DefaultCover} alt={p.title} className={styles.cover} />
          <div style={{ minWidth: 0 }}>
            <div className={styles.title}>{p.title}</div>
            <div className={styles.sub}>{p.description || '歌单'}</div>
          </div>
          <div className={styles.meta}>
            来源：
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PlatformIcon platform={p.platform} size={18} />
              <span>{p.platform}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
