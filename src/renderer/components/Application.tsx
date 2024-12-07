import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './tailwind.css';
import usePlayer from '@renderer/hooks/usePlayer';
import useMainWindow from '@renderer/hooks/useMainWindow';
import TopBar from '@components/TopBar/TopBar';
import MusicLibrary from '@components/Musiclibrary/Musiclibrary';
import MainContent from '@components/Maincontent/MainContent';
import RightContent from '@components/RightContent/RightContent';
import useMusicLibrary from '@renderer/hooks/useMusiclibrary';
import PlayerBar from '@components/Playerbar/PlayerBar';
import context from '@main/app/electronContextApi';


const Application: React.FC = () => {

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
    changeVolume,
  } = usePlayer(audioRef);


  // window.queue = queueRef.current;
  // window.currentIndex = currentIndexRef.current;
  // window.currentTrackInfo = currentTrackInfoRef.current;
  // window.nextTracks = nextTracksRef.current;


  // 使用 useMusiclibrary Hook 管理歌单
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
      const state: any = dumpPlayerState();
      context.sendPlayerState(state);
    };

    // 定义快捷键回调函数
    const handleShortcut = (data: any) => {
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
    // 注册事件监听器
    const removeRequestPlayerStateListener = context.onRequestPlayerState(handleRequestPlayerState);
    context.onShortcut(handleShortcut);
    return () => {
      // 在清理函数中移除监听器
      removeRequestPlayerStateListener();
      context.removeShortcutListener();
      console.log('已移除所有 IPC 监听器');
    };
  }, []);


  useEffect(() => {
    const audioElement = audioRef.current;

    if (audioElement) {
      // 当音频的元数据加载完成时，更新音频元数据
      const handleLoadedMetadata = () => {
        setCurrentTrackInfoDuration(audioElement.duration);
      };

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


  // Application.tsx

  return (
    <div className="App h-full w-full  flex-col bg-black flex">
      {/* 音频元素 */}
      <audio ref={audioRef} src={playerStateRef.current.audioSrc} hidden={true} />
      <TopBar
        onSwitchView={setMainContentView}
        currentView={mainContentView}
        setSearchResults={setSearchResults}
        setMainContentView={setMainContentView}
      />
      {/* 主内容容器 */}
      <div
        className="grid h-full w-full overflow-hidden "
        style={{
          display: 'grid',
          gridTemplateColumns: `${isMusicLibraryCollapsed ? '72px' : '250px'} minmax(416.67px, 1fr) ${isRightContentVisible ? 'minmax(0, 300px)' : ''}`,
          gap: '0.5rem',
          padding: '0.5rem',
          transition: 'grid-template-columns 0.3s ease',
        }}
      >
        {/* 左侧栏 */}
        <MusicLibrary
          className="h-full overflow-y-auto"
          libraryItems={playlists}
          selectedItem={selectedItem}
          refreshPlaylist={refreshPlaylists}
          onSelectItem={setSelectedItem}
          mainContentView={mainContentView}
          setMainContentView={setMainContentView}
          isMusicLibraryCollapsed={isMusicLibraryCollapsed}
          onToggleMusicLibraryCollapsed={() => setIsMusicLibraryCollapsed(!isMusicLibraryCollapsed)}
        />
        {/* 中间主内容区域 */}
        <MainContent
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
            className="h-full overflow-y-auto"
            playerState={playerStateRef.current}
            clearQueue={clearQueue}
          />
        )}
      </div>
      {/* 底部播放条 */}
      <PlayerBar
        playerState={playerStateRef.current}
        setCurrentTime={setCurrentTime}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onTogglePlayPause={togglePlayPause}
        onCyclePlaybackMode={cyclePlaybackMode}
        onVolumeChange={setVolume}
        onToggleRightContent={toggleRightContent}
      />
    </div>
  );
};

export default Application;
