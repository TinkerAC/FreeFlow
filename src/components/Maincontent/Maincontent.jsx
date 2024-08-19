import React from 'react';
import './Maincontent.css';


import {PlaylistView} from "../PlaylistView/PlaylistView.js";

const Maincontent = ({tracks, onReplacePlayQueue, onAddTracksToPlayQueue,playNewTrack}) => {
    return (
        <div className="main-content overflow-y-auto">
            <PlaylistView tracks={tracks}
                          onReplacePlayQueue={onReplacePlayQueue}
                          onAddTracksToPlayQueue={onAddTracksToPlayQueue}
                          playNewTrack={playNewTrack}
            />
        </div>
    );
}

export default Maincontent;
