import React, {useRef, useState} from 'react';
import usePlayer from './hooks/usePlayer.js';
import useMusicLibrary from './hooks/useMusiclibrary.js';
import Headbar from './components/Headbar/Headbar.jsx';
import Musiclibrary from './components/Musiclibrary/Musiclibrary.jsx';
import Maincontent from './components/Maincontent/Maincontent.jsx';
import Playerbar from './components/Playerbar/Playerbar.jsx';
import './App.css';
import RightContent from "./components/RightContent/RightContent.jsx";
import {PlaylistView} from "./components/PlaylistView/PlaylistView.jsx";

function App() {
    const audioRef = useRef(null);

    // 使用 usePlayer Hook 管理播放器状态和逻辑
    const {
        currentIndex = 0,
        audioSrc,
        isPlaying,
        currentTime,
        trackInfo,
        playbackMode,
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        cyclePlaybackMode,
        setCurrentTime,
        setIsPlaying,
        addTracksToPlayQueue,
        replacePlayQueue,
        playNewTrack,
        seekTo,
        nextTracks,
        changeVolume,
        currentTrackInfo

    } = usePlayer(audioRef);

    // 使用 useMusicLibrary Hook 管理歌单
    const {
        playlists,
        selectedItem,
        selectedPlaylistInfo,
        setSelectedItem,
    } = useMusicLibrary();

    const [searchResults, setSearchResults] = useState([]);

    const [mainContentView, setMainContentView] = useState('playlists');


    return (
        <div className="App h-full flex flex-col bg-black">
            <audio ref={audioRef} src={audioSrc} hidden/>
            <Headbar className="sticky top-0 z-1000 w-full"
                     onSwitchView={setMainContentView}
                     currentView={mainContentView}
                     setSearchResults={setSearchResults}
            />
            <div className="grid grid-cols-[300px_auto_360px] gap-2 h-full w-full overflow-y-hidden">
                <Musiclibrary
                    className="h-full"
                    libraryItems={playlists}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                />
                <Maincontent
                    className="h-full"
                    view={mainContentView}
                    selectedPlaylistInfo={selectedPlaylistInfo}
                    onReplacePlayQueue={replacePlayQueue}
                    onAddTracksToPlayQueue={addTracksToPlayQueue}
                    playNewTrack={playNewTrack}
                    searchResults={searchResults}
                />
                <RightContent
                    currentTrack={currentTrackInfo}
                    nextTracks={nextTracks}
                />
            </div>

            <Playerbar
                className="sticky bottom-0 z-1000 w-full"
                audioSrc={audioSrc}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                currentTime={currentTime}
                setCurrentTime={setCurrentTime}
                trackInfo={currentTrackInfo}
                playbackMode={playbackMode}
                onPlayNext={playNext}   // 传入播放下一首的函数
                onPlayPrevious={playPrevious} // 传入播放上一首的函数
                onTogglePlayPause={togglePlayPause} // 传入切换播放状态的函数
                onCyclePlaybackMode={cyclePlaybackMode} // 传入轮询播放模式的函数
                onSeekTo={seekTo} // 传入跳转到指定时间的函数
                onVolumeChange={changeVolume} // 传入音量变化的函数
            />
        </div>
    );
}

export default App;
