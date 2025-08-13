import React from 'react';
import styles from './ListRow.module.css';
import { DefaultCover } from '@components/static';
import { searchContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { Platform } from '@main/core/enum/Platform';

export default function PlaylistsTab({
                                       playlists, musicLibraryController, viewStack,
                                     }: {
  playlists: PlaylistEntity[];
  musicLibraryController: MusicLibraryController;
  viewStack: MainContentViewStack;
}) {
  if (!playlists?.length) return <div style={{ opacity: .7 }}>没有找到歌单。</div>;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {playlists.map((p) => (
        <div
          key={`${p.platform}_${p.platform_unique_id}`}
          className={styles.row}
          onClick={async () => {
            const id = p.platform_unique_id;
            if (p.platform === Platform.BILIBILI) {
              //B站歌单直接返回
              musicLibraryController.activePlaylist = p;
            } else {
              musicLibraryController.activePlaylist = await searchContext.getPlaylistDetail(p.platform, id);
            }
            viewStack.navigate(View.PLAY_LIST);
          }}
        >
          <img src={p.playlist_cover || DefaultCover} alt={p.title} className={styles.cover} />
          <div style={{ minWidth: 0 }}>
            <div className={styles.title}>{p.title}</div>
            <div className={styles.sub}>{p.description || '歌单'}</div>
          </div>
          <div className={styles.meta}>来源：{p.platform}</div>
        </div>
      ))}
    </div>
  );
}