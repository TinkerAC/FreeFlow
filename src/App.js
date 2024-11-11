import React, {useEffect, useRef, useState} from 'react';
import usePlayer from './hooks/usePlayer.js';
import useMusicLibrary from './hooks/useMusicLibrary.js';
import useMainWindow from './hooks/useMainWindow.js'; // 导入自定义的 useMainWindow Hook
import Headbar from './components/Headbar/Headbar.jsx';
import Musiclibrary from './components/Musiclibrary/Musiclibrary.jsx';
import Maincontent from './components/Maincontent/Maincontent.jsx';
import PlayerBar from './components/Playerbar/PlayerBar.jsx';
import './App.css';
import RightContent from "./components/RightContent/RightContent.jsx";


function App() {
    const audioRef = useRef(null);

    // 使用 usePlayer Hook 管理播放器状态和逻辑
    const {
        playerStateRef,
        dumpPlayerState,
        replacePlayQueue,
        addToNext,
        addToNextAndPlay,
        clearQueue,
        playPrevious,
        playNext,
        togglePlayPause,
        setVolume,
        setCurrentTime,
        cyclePlaybackMode,
        setCurrentTrackInfoDuration,
    } = usePlayer(audioRef);


    // window.queue = queueRef.current;
    // window.currentIndex = currentIndexRef.current;
    // window.currentTrackInfo = currentTrackInfoRef.current;
    // window.nextTracks = nextTracksRef.current;


    // 使用 useMusicLibrary Hook 管理歌单
    const {
        playlists,
        selectedItem,
        selectedPlaylistInfo,
        setSelectedItem,
        refreshPlaylists,
    } = useMusicLibrary();

    // 使用 useMainWindow Hook 管理窗口状态和逻辑
    const {
        isMusicLibraryCollapsed,
        setIsMusicLibraryCollapsed,
        isRightContentVisible,
        toggleRightContent,
    } = useMainWindow();


    useEffect(() => {
        // 定义回调函数
        const handleRequestPlayerState = () => {
            // 获取当前播放器状态
            const state = dumpPlayerState(); // 假设这是一个获取当前播放器状态的函数
            // 通过暴露的 API 将状态发送到主进程
            window.electronAPI.sendPlayerState(state);
        };

        // 定义快捷键回调函数
        const handleShortcut = (data) => {
            switch (data) {
                case 'prev':
                    playPrevious().then();
                    break;
                case 'next':
                    playNext().then();
                    break;
                case 'play-pause':
                    togglePlayPause();
                    break;
                case 'volume-up':
                    changeVolume(0.1);
                    break;
                case 'volume-down':
                    changeVolume(-0.1);
                    break;
                default:
                    console.log('未知快捷键操作');
            }
        };

        // 使用暴露的 API 监听来自主进程的请求播放器状态的事件
        const removeRequestPlayerStateListener = window.electronAPI.onRequestPlayerState(handleRequestPlayerState);

        // 使用暴露的 API 监听全局快捷键事件
        const removeShortcutListener = window.playerAPI.onShortcut(handleShortcut);

        // 清理函数，以防止内存泄漏
        return () => {
            removeRequestPlayerStateListener();
            removeShortcutListener();
            console.log('已移除所有 IPC 监听器');
        };
    }, []); // 依赖数组为空，确保此副作用只在组件挂载和卸载时运行


    useEffect(() => {
        const audioElement = audioRef.current;

        if (audioElement) {
            // 当音频的元数据加载完成时，更新音频元数据
            const handleLoadedMetadata = () => {
                setCurrentTrackInfoDuration(audioElement.duration);
            }

            // 为 loadedmetadata 事件添加监听器
            audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);

            // 清理函数，移除事件监听器
            return () => {
                audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            };
        }
    }, [playerStateRef.current.audioSrc]); // 当音频地址改变时重新绑定事件监听器

    const [searchResults, setSearchResults] = useState([]); // 用于存储搜索结果
    const [mainContentView, setMainContentView] = useState('playlist'); // 用于控制主内容区域显示的内容


    return (

        <div className="App h-full flex flex-col bg-black">
            <script src="https://cdn.tailwindcss.com"></script>
            <audio ref={audioRef} src={playerStateRef.current.audioSrc} hidden={true}/>
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
                    gridTemplateColumns: `${isMusicLibraryCollapsed ? '72px' : '250px'} minmax(416.67px, 1fr) ${isRightContentVisible ? 'minmax(0, 300px)' : ''}`,
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
                    refreshPlaylist={refreshPlaylists}
                    onSelectItem={setSelectedItem}
                    mainContentView={mainContentView}
                    setMainContentView={setMainContentView}
                    isMusicLibraryCollapsed={isMusicLibraryCollapsed} // 传递折叠状态
                    onToggleMusicLibraryCollapsed={() => setIsMusicLibraryCollapsed(!isMusicLibraryCollapsed)} // 允许手动控制左侧栏折叠状态
                />
                {/* 中间主内容区域 */}
                <Maincontent
                    view={mainContentView}
                    selectedPlaylistInfo={selectedPlaylistInfo}
                    onReplacePlayQueue={replacePlayQueue}
                    onAddToNext={addToNext}
                    onAddToNextAndPlay={addToNextAndPlay}
                    searchResults={searchResults}
                    refreshPlaylists={refreshPlaylists}
                    playlists={playlists}
                />
                {/* 右侧栏 */}
                {isRightContentVisible && (
                    <RightContent
                        currentTrack={playerStateRef.current.currentTrackInfo}
                        nextTracks={playerStateRef.current.nextTracks}
                        clearQueue={clearQueue}
                    />
                )}
            </div>

            {/* 底部播放条 */}
            <PlayerBar
                className="sticky bottom-0 z-1000 w-full"
                playerState={playerStateRef.current}
                setCurrentTime={setCurrentTime}
                onPlayNext={playNext}
                onPlayPrevious={playPrevious}
                onTogglePlayPause={togglePlayPause}
                onCyclePlaybackMode={cyclePlaybackMode}
                onSeekTo={setVolume}
                onVolumeChange={setVolume}
                onToggleRightContent={toggleRightContent} // 传递方法给播放条，允许用户控制右侧栏显示状态
            />
        </div>
    );
}

export default App;
