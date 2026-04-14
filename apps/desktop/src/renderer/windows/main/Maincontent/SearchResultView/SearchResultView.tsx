import React, { useState } from 'react';
import useStateRef from 'react-usestateref';
import PlayerController from '@renderer/core/controller/PlayerController';
import styles from './SearchResultView.module.css';

import TabNav, { TabKey } from './TabNav';
import ContextMenu from './ContextMenu';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlaylistsTab from './PlaylistTab';
import TracksTab from './TrackTab';
import PopularTab from './PopularTab';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import OnchainTab from './OnchainTab';
import { Platform } from '@main/core/enum/Platform';

export default function SearchResultView({
                                           initialTab = 'popular',
                                           fusionSearchResult,
                                           player,
                                           musicLibraryController,
                                         }: {
  initialTab?: TabKey;
  fusionSearchResult: FusionSearchResult | null;
  musicLibraryController: MusicLibraryController;
  player: PlayerController;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [contextMenu, setContextMenu] = useStateRef<{ x: number; y: number } | null>(null);
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackEntity | null>(null);

  if (!fusionSearchResult) {
    return (
      <ViewShell>
        <div style={{ opacity: .7, padding: '32px 0', textAlign: 'center' }}>请输入关键词进行搜索…</div>
      </ViewShell>
    );
  }

  const { track_result = [], playlist_result = [] } = fusionSearchResult;
  const popularResult = track_result[0];
  const onchainTracks = track_result.filter((track) => track.platform === Platform.FREEFLOW);

  const openContextMenu = (e: React.MouseEvent<HTMLDivElement>, track: TrackEntity) => {
    e.preventDefault();
    setSelectedTrack(track);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };
  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedTrack(null);
  };

  return (
    <ViewShell
      header={<TabNav activeTab={activeTab} onTabChange={setActiveTab} />}
      hideScrollbar
    >
      <div className={styles.content}>
        {activeTab === 'popular' && (
          <PopularTab track={popularResult} player={player} onContextMenu={openContextMenu} />
        )}
        {activeTab === 'tracks' && (
          <TracksTab tracks={track_result} player={player} onContextMenu={openContextMenu} />
        )}
        {activeTab === 'onchain' && (
          <OnchainTab tracks={onchainTracks} player={player} onContextMenu={openContextMenu} />
        )}
        {activeTab === 'playlists' && (
          <PlaylistsTab playlists={playlist_result} musicLibraryController={musicLibraryController} />
        )}
      </div>

      {/* Portal 菜单 + 点击空白关闭 */}
      {contextMenu && selectedTrackRef.current && (
        <>
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            track={selectedTrackRef.current}
            player={player}
            addToLibrary={(t) => libraryContext.addTrackToLibrary(t).then(() => {
              musicLibraryController.refreshPlaylists();
            })}
            addTrackToPlaylist={(t, id) => playlistContext.addTrackToPlaylist(t, id).then(() => {
              musicLibraryController.refreshPlaylists();
            })}
            playlists={musicLibraryController.playlists}
            handleCloseMenu={closeContextMenu}
          />
          {/** 透明遮罩，不阻止滚动，只拦截点击 */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={closeContextMenu} />
        </>
      )}
    </ViewShell>
  );
}
