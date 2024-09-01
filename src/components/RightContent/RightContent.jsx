import React from "react";
import "./RightContent.css";
import PlayQueue from "../PlayQueue/PlayQueue.jsx";

export default function RightContent({currentTrack, nextTracks}) {

    return <div className="right-content">
        <PlayQueue
            currentTrack={currentTrack}
            nextTracks={nextTracks}/>
    </div>;

}



