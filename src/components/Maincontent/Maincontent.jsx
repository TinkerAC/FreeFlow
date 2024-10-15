import React from 'react';
import './Maincontent.css';
import NetSearchResultView from "../SearchResultView/SearchResultView.jsx";
import { PlaylistView } from "../PlaylistView/PlaylistView.jsx";

export default function Maincontent({
    view,
    selectedPlaylistInfo,
    onReplacePlayQueue,
    onAddToNext,
    onAddToNextAndPlay,
    searchResults,
    refreshPlaylists
}) {
    // Render different views inside the main content container
    let viewComponent;
    if (view === "playlist") {
        viewComponent = (
            <PlaylistView
                playListInfo={selectedPlaylistInfo}
                onReplacePlayQueue={onReplacePlayQueue}
                addToNext={onAddToNext}
                addToNextAndPlay={onAddToNextAndPlay}
            />
        );
    } else if (view === "searchResults") {
        viewComponent = (
            <NetSearchResultView
                popularResult={searchResults?.[0] || {}}
                tracks={searchResults}
                addToNext={onAddToNext}
                addToNextAndPlay={onAddToNextAndPlay}
                refreshPlaylists={refreshPlaylists}
            />
        );
    }

    return (
        <div className="main-content">
            {viewComponent}
        </div>
    );
}
