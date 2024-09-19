import React from "react";
import "./RightContent.css";
import PlayQueue from "../PlayQueue/PlayQueue.jsx";

export default function RightContent({currentTrack, nextTracks, clearQueue}) {


    if (!currentTrack && !nextTracks.length) {
        return <div className="right-content">
            <div className="empty-play-queue">
                <i className="fas fa-music text-4xl text-gray-400"></i>
                <p className="text-gray-400 whitespace-nowrap">暂无播放队列</p>
            </div>
        </div>;
    }


    return <div className="right-content">
        <PlayQueue
            currentTrack={currentTrack}
            nextTracks={nextTracks}
            clearQueue={clearQueue}
        />

    </div>;

}



