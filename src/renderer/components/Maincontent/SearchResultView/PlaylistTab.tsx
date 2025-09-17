import React from 'react';
import styles from './ListRow.module.css';
import { DefaultCover, Bilibili, Hifini, NetEaseCloudMusic, QQMusic, YouTubeMusic } from '@components/static';
import { searchContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { useNavigate } from 'react-router-dom';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { Platform } from '@main/core/enum/Platform';

export default function PlaylistsTab({
  playlists, musicLibraryController,
}: {
  playlists: PlaylistEntity[];
  musicLibraryController: MusicLibraryController;
}) {
  const navigate = useNavigate();
  if (!playlists?.length) return <div style={{ opacity: .7 }}>没有找到歌单。</div>;

  const renderPlatformIcon = (platform: string) => {
    const size = 18;
    const style = { width: size, height: size, objectFit: 'contain' } as const;
    switch (platform) {
      case Platform.NET_EASE_CLOUD_MUSIC:
        return <img src={NetEaseCloudMusic} alt={platform} style={style} />;
      case Platform.HIFINI:
        return <img src={Hifini} alt={platform} style={style} />;
      case Platform.QQ_MUSIC:
        return <img src={QQMusic} alt={platform} style={style} />;
      case Platform.BILIBILI:
        return <img src={Bilibili} alt={platform} style={style} />;
      case Platform.YOUTUBE_MUSIC:
        return <img src={YouTubeMusic} alt={platform} style={style} />;
      default:
        return null;
    }
  };

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
            navigate('/playlist');
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
              {renderPlatformIcon(p.platform)}
              <span>{p.platform}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
