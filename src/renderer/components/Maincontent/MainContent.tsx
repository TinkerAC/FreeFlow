// file: src/renderer/components/MainContent/MainContent.tsx
import React from 'react';
import NetSearchResultView from '@components/SearchResultView/SearchResultView';
import PlaylistView from '@components/PlaylistView/PlaylistView';
import ProfileView from '@components/ProfileView/ProfileView';
import { FusionSearchResult, PlayerState, PlaylistModel, TrackModel } from '@src/shared/types';
import ContentPanel from '@components/ContentPanel/ContentPenal';
import LyricView from '@components/LyricView/LyricView';

interface MainContentProps {
  view: string;
  selectedPlaylistInfo: PlaylistModel;
  onReplacePlayQueue: (tracks: TrackModel[]) => void;
  onAddToNext: (track: TrackModel) => void;
  setSelectedPlaylistInfo: (playlist: PlaylistModel) => void;
  onAddToNextAndPlay: (track: TrackModel) => void;
  searchResults: FusionSearchResult;
  refreshPlaylists: () => void;
  playlists: PlaylistModel[];
  setMainContentView: (view: string) => void;
  playerState: PlayerState;
  setCurrentTime: (time: number) => void;
}

export default function MainContent({
                                      view,
                                      selectedPlaylistInfo,
                                      onReplacePlayQueue,
                                      onAddToNext,
                                      setSelectedPlaylistInfo,
                                      onAddToNextAndPlay,
                                      searchResults,
                                      refreshPlaylists,
                                      playlists,
                                      setMainContentView,
                                      playerState,
                                      setCurrentTime,
                                    }: MainContentProps) {
  let viewComponent;
  if (view === 'playlist') {
    viewComponent = (
      <PlaylistView
        playListInfo={selectedPlaylistInfo}
        onReplacePlayQueue={onReplacePlayQueue}
        addToNext={onAddToNext}
        addToNextAndPlay={onAddToNextAndPlay}
        refreshPlaylist={refreshPlaylists}
        playlists={playlists}
      />
    );
  } else if (view === 'searchResults') {
    viewComponent = (
      <NetSearchResultView
        addToNext={onAddToNext}
        addToNextAndPlay={onAddToNextAndPlay}
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
      playerState={playerState}
      setCurrentTime={setCurrentTime}
    />;
  }

  return (
    <ContentPanel className="h-full w-full">
      {viewComponent}
    </ContentPanel>
  );
}