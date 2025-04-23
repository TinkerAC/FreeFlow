// file: src/renderer/components/MainContent/MainContent.tsx
import React from 'react';
import NetSearchResultView from '@components/SearchResultView/SearchResultView';
import PlaylistView from '@components/PlaylistView/PlaylistView';
import ProfileView from '@components/ProfileView/ProfileView';
import { FusionSearchResult, PlaylistModel } from '@src/shared/types';
import ContentPanel from '@components/ContentPanel/ContentPenal';
import LyricView from '@components/LyricView/LyricView';
import Player from '@components/Player';

interface MainContentProps {
  view: string;
  selectedPlaylistInfo: PlaylistModel;
  setSelectedPlaylistInfo: (playlist: PlaylistModel) => void;
  searchResults: FusionSearchResult;
  refreshPlaylists: () => void;
  playlists: PlaylistModel[];
  setMainContentView: (view: string) => void;
  player: Player;
}

export default function MainContent({
                                      view,
                                      selectedPlaylistInfo,
                                      setSelectedPlaylistInfo,
                                      searchResults,
                                      refreshPlaylists,
                                      playlists,
                                      setMainContentView,
                                      player,
                                    }: MainContentProps) {
  let viewComponent;
  if (view === 'playlist') {
    viewComponent = (
      <PlaylistView
        playListInfo={selectedPlaylistInfo}
        player={player}
        refreshPlaylist={refreshPlaylists}
        playlists={playlists}
      />
    );
  } else if (view === 'searchResults') {
    viewComponent = (
      <NetSearchResultView
        player={player}
        refreshPlaylists={refreshPlaylists}
        fusionSearchResult={searchResults}
        onSelectOnlinePlaylist={setSelectedPlaylistInfo}
        setMainContentView={setMainContentView}
        savedPlaylists={playlists}
      />
    );
  } else if (view === 'profile') {
    viewComponent = <ProfileView />;
  } else if (
    view === 'lyric'
  ) {
    viewComponent = <LyricView
      player={player}

    />;
  }

  return (
    <ContentPanel className="h-full w-full">
      {viewComponent}
    </ContentPanel>
  );
}