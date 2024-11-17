import React from 'react';
import './Maincontent.css';
import NetSearchResultView from "../SearchResultView/SearchResultView.jsx";
import {PlaylistView} from "../PlaylistView/PlaylistView.jsx";
import ProfileView from "../ProfileView/ProfileView.jsx";

export default function Maincontent({
                                        view,
                                        selectedPlaylistInfo,
                                        onReplacePlayQueue,
                                        onAddToNext,
                                        onAddToNextAndPlay,
                                        searchResults,
                                        refreshPlaylists,
                                        playlists,

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
                refreshPlaylist={refreshPlaylists}
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
                playlists={playlists}
            />
        );
    } else if (view === "profile") {
        viewComponent = (
            <ProfileView
                playlists={playlists}
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
