import React from 'react';
import './Maincontent.css';
import NetSearchResultView from "../SearchResultView/SearchResultView.jsx";

import {PlaylistView} from "../PlaylistView/PlaylistView.jsx";

export default function Maincontent({
                                        view,
                                        selectedPlaylistInfo,
                                        onReplacePlayQueue,
                                        onAddToNext,
                                        onAddToNextAndPlay,
                                        searchResults,
                                        refreshPlaylists
                                    }) {
    // console.log('Maincontent:', view, selectedPlaylistInfo);

    if (view === "playlist") {
        return (<div className="main-content">
            <PlaylistView
                playListInfo={selectedPlaylistInfo}
                onReplacePlayQueue={onReplacePlayQueue}
                addToNext={onAddToNext}
                addToNextAndPlay={onAddToNextAndPlay}/>
        </div>)
    } else if (view === "searchResults") {
        return (<div className="main-content">
            <NetSearchResultView
                popularResult={searchResults?.[0] || {}}
                tracks={searchResults}
                addToNext={onAddToNext}
                addToNextAndPlay={onAddToNextAndPlay}
                refreshPlaylists={refreshPlaylists}
            />

        </div>)
    }
}


