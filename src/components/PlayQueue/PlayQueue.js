import React from "react";


function PlayQueue(currentTrack, nextTracks) {
    const currentSong = currentTrack;
    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex space-x-4">
                    <span className="active-tab">队列</span>
                    <span>最近播放</span>
                </div>
                <i className="fas fa-times"></i>
            </div>
            <div className="mb-4">
                <h2 className="text-lg mb-2">当前播放</h2>
                <div className="flex items-center space-x-4">
                    <img src={currentSong.img} alt={`Album cover of ${currentSong.title}`} className="w-12 h-12"/>
                    <div>
                        <div className="current-song">{currentSong.title}</div>
                        <div>{currentSong.artist}</div>
                    </div>
                </div>
            </div>
            <div>
                <h2 className="text-lg mb-2">下一首歌来自：已点赞的歌曲</h2>
                <div className="space-y-4">
                    {nextTracks.map((song, index) => (
                        <div key={index} className="flex items-center space-x-4">
                            <img src={song.img} alt={`Album cover of ${song.title}`} className="w-12 h-12"/>
                            <div>
                                <div>{song.title}</div>
                                <div>{song.artist}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default PlayQueue;
