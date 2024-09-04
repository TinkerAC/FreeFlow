import React, {useRef, useState} from 'react';
import usePlayer from './hooks/usePlayer.js';
import useMusicLibrary from './hooks/useMusicLibrary.js';
import useMainWindow from './hooks/useMainWindow.js';  // 导入自定义的 useMainWindow Hook
import Headbar from './components/Headbar/Headbar.jsx';
import Musiclibrary from './components/Musiclibrary/Musiclibrary.jsx';
import Maincontent from './components/Maincontent/Maincontent.jsx';
import Playerbar from './components/Playerbar/Playerbar.jsx';
import './App.css';
import RightContent from "./components/RightContent/RightContent.jsx";

function App() {
    const audioRef = useRef(null);

    // 使用 usePlayer Hook 管理播放器状态和逻辑
    const {
        queueRef,
        currentIndexRef,
        audioSrcRef,
        isPlayingRef,
        currentTimeRef,
        playbackModeRef,
        currentTrackInfoRef,
        nextTracksRef,
        play,
        pause,
        togglePlayPause,
        playNext,
        playPrevious,
        cyclePlaybackMode,
        addToNext,
        addToNextAndPlay,
        replacePlayQueue,
        seekTo,
        changeVolume,
        setIsPlaying,
        setCurrentTime,
    } = usePlayer(audioRef);

    // 使用 useMusicLibrary Hook 管理歌单
    const {
        playlists,
        selectedItem,
        selectedPlaylistInfo,
        setSelectedItem,
        isMusicLibraryCollapsed: initialCollapseState,
        setIsMusicLibraryCollapsed: setInitialCollapseState,
    } = useMusicLibrary();

    // 使用 useMainWindow Hook 管理窗口状态和逻辑
    const {
        isMusicLibraryCollapsed,
        setIsMusicLibraryCollapsed,
        isRightContentVisible,
        toggleRightContent,
    } = useMainWindow();

    const [searchResults, setSearchResults] = useState([]); // 用于存储搜索结果
    const [mainContentView, setMainContentView] = useState('playlist'); // 用于控制主内容区域显示的内容

    return (
        <div className="App h-full flex flex-col bg-black">
            <audio ref={audioRef} src={audioSrcRef.current} hidden/>
            <Headbar
                className="sticky top-0 z-1000 w-full"
                onSwitchView={setMainContentView}
                currentView={mainContentView}
                setSearchResults={setSearchResults}
                onToggleRightContent={toggleRightContent} // 传递方法给头部栏，允许用户控制右侧栏显示状态
            />
            <div
                className="grid h-full w-full overflow-y-hidden overflow-x-auto"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `${isMusicLibraryCollapsed ? '72px' : '250px'} minmax(625px, 1fr) ${isRightContentVisible ? 'minmax(0, 300px)' : ''}`,
                    gap: '0.5rem',
                    padding: ' 0.5rem',//为左右边界添加间距
                    transition: 'grid-template-columns 0.3s ease', // 可选过渡效果
                }}
            >
                {/* 左侧栏 */}
                <Musiclibrary
                    className="h-full"
                    libraryItems={playlists}
                    selectedItem={selectedItem}
                    onSelectItem={setSelectedItem}
                    mainContentView={mainContentView}
                    setMainContentView={setMainContentView}
                    isMusicLibraryCollapsed={isMusicLibraryCollapsed} // 传递折叠状态
                    onToggleMusicLibraryCollapsed={() => setIsMusicLibraryCollapsed(!isMusicLibraryCollapsed)} // 允许手动控制左侧栏折叠状态
                />
                {/* 中间主内容区域 */}
                <Maincontent
                    className="h-full"
                    view={mainContentView}
                    selectedPlaylistInfo={selectedPlaylistInfo}
                    onReplacePlayQueue={replacePlayQueue}
                    onAddToNext={addToNext}
                    onAddToNextAndPlay={addToNextAndPlay}
                    searchResults={searchResults}
                />
                {/* 右侧栏 */}
                {isRightContentVisible && (
                    <RightContent
                        currentTrack={currentTrackInfoRef.current}
                        nextTracks={nextTracksRef.current}
                    />
                )}
            </div>

            {/* 底部播放条 */}
            <Playerbar
                className="sticky bottom-0 z-1000 w-full"
                audioSrc={audioSrcRef.current}
                isPlaying={isPlayingRef.current}
                setIsPlaying={setIsPlaying}
                currentTime={currentTimeRef.current}
                setCurrentTime={setCurrentTime}
                trackInfo={currentTrackInfoRef.current}
                playbackMode={playbackModeRef.current}
                onPlayNext={playNext}
                onPlayPrevious={playPrevious}
                onTogglePlayPause={togglePlayPause}
                onCyclePlaybackMode={cyclePlaybackMode}
                onSeekTo={seekTo}
                onVolumeChange={changeVolume}
                onToggleRightContent={toggleRightContent} // 传递方法给播放条，允许用户控制右侧栏显示状态
            />
        </div>
    );
}

export default App;
