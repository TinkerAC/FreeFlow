import React from 'react';
import './Maincontent.css';
import NetSearchResultView from '@components/SearchResultView/SearchResultView';
import PlaylistView from '@components/PlaylistView/PlaylistView';
import ProfileView from '@components/ProfileView/ProfileView';

interface MainContentProps {
  view: string;
  selectedPlaylistInfo: any;
  onReplacePlayQueue: (tracks: any[]) => void;
  onAddToNext: (tracks: any[]) => void;
  onAddToNextAndPlay: (tracks: any[]) => void;
  searchResults: any[];
  refreshPlaylists: () => void;
  playlists: any[];
}


export default function MainContent({
                                      view,
                                      selectedPlaylistInfo,
                                      onReplacePlayQueue,
                                      onAddToNext,
                                      onAddToNextAndPlay,
                                      searchResults,
                                      refreshPlaylists,
                                      playlists,

                                    }: MainContentProps) {
  // Render different views inside the main content container
  let viewComponent;
  if (view === 'playlist') {
    viewComponent = (
      <PlaylistView
        playListInfo={selectedPlaylistInfo}
        onReplacePlayQueue={onReplacePlayQueue}
        addToNext={onAddToNext}
        addToNextAndPlay={onAddToNextAndPlay}
        refreshPlaylist={refreshPlaylists}
        onUpdatePlaylist={() => {
        }}
      />
    );
  } else if (view === 'searchResults') {
    viewComponent = (
      <NetSearchResultView
        popularResult={searchResults?.[0] || {}}
        tracks={searchResults}
        addToNext={onAddToNext}
        addToNextAndPlay={onAddToNextAndPlay}
        refreshPlaylists={refreshPlaylists}
        playlists={playlists}
      />
    );
  } else if (view === 'profile') {
    viewComponent = (
      <ProfileView
      />
    );
  }

  return (
    <div className="main-content">
      {viewComponent}
    </div>
  );
}
