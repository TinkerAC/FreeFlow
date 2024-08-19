import React from "react";
import "./RightContent.css";
import PlayQueue from "../PlayQueue/PlayQueue.js";

const RightContent = ({playerRef}) => {
    const currentTrack = playerRef.current.getCurrentTrack();
    const nextTracks = playerRef.current.getNextTracks();
    return <div className="right-content">
        <PlayQueue
            currentTrack={currentTrack}
            nextTracks={nextTracks}/>

    </div>;

}
export default RightContent;


