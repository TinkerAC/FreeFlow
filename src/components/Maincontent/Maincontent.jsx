import React from 'react';
import './Maincontent.css';
import NetSearchResultView from "../SearchResultView/SearchResultView.jsx";

import {PlaylistView} from "../PlaylistView/PlaylistView.jsx";

export default function Maincontent({
                                        view,
                                        selectedPlaylistInfo,
                                        onReplacePlayQueue,
                                        onAddTracksToPlayQueue,
                                        playNewTrack,
                                        searchResults
                                    }) {
    console.log('Maincontent:', view, selectedPlaylistInfo);

    if (view === "playlists") {
        return (<div className="main-content">
            <PlaylistView
                playListInfo={selectedPlaylistInfo}
                onReplacePlayQueue={onReplacePlayQueue}
                onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                playNewTrack={playNewTrack}/>
        </div>)
    } else if (view === "searchResults") {
        return (<div className="main-content">
            <NetSearchResultView
                popularResult={searchResults?.[0] || {}}
                tracks={searchResults}
                playNewTrack={playNewTrack}
            />
        </div>)
    }
}


