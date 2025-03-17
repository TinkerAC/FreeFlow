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
import { FusionSearchResult, PlayerState } from '@src/shared/types';
import { playerContext, shortcutContext } from '@main/app/electronContextApi';

const Application: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

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

  // 使用 useMusicLibrary Hook 管理歌单
  const {
    playlists,
    selectedItem,
    selectedPlaylistInfo,
    setSelectedItem,
    refreshPlaylists,
    setSelectedPlaylistInfo,
  } = useMusicLibrary();

  // 使用 useMainWindow Hook 管理窗口状态和逻辑
  const {
    isMusicLibraryCollapsed,
    setIsMusicLibraryCollapsed,
    isRightContentVisible,
    toggleRightContent,
  } = useMainWindow();

  useEffect(() => {
    // 注册播放器状态和快捷键事件
    const handleRequestPlayerState = () => {
      const state: PlayerState = dumpPlayerState();
      playerContext.sendPlayerState(state);
    };
    const handleNotification = (message: string) => {
      alert(message);
    };
    const handleShortcut = (data: string) => {
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

    const removeRequestPlayerStateListener = playerContext.onRequestPlayerState(handleRequestPlayerState);
    shortcutContext.onShortcut(handleShortcut);
    playerContext.onNotification(handleNotification);
    return () => {
      removeRequestPlayerStateListener();
      shortcutContext.removeShortcutListener();
      console.log('已移除所有 IPC 监听器');
    };
  }, []);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handleLoadedMetadata = () => {
        setCurrentTrackInfoDuration(audioElement.duration);
      };
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [playerStateRef.current.audioSrc]);

  const [searchResults, setSearchResults] = useState<FusionSearchResult>({
    tracks: [],
    playlists: [],
  });
  const [mainContentView, setMainContentView] = useState('playlist');

  return (
    <div className="App h-full w-full flex flex-col bg-black flex-direction: column">
      {/* 音频元素 */}
      <audio ref={audioRef} src={playerStateRef.current.audioSrc} hidden />

      {/* 顶部导航栏 */}
      <TopBar
        onSwitchView={setMainContentView}
        currentView={mainContentView}
        setSearchResults={setSearchResults}
      />

      {/* 主内容区域：采用 flex-1 占据中间剩余空间 */}
      <div
        className="flex-1 overflow-hidden grid"
        style={{
          gridTemplateColumns: `${isMusicLibraryCollapsed ? '72px' : '250px'} minmax(416.67px, 1fr) ${
            isRightContentVisible ? 'minmax(0, 300px)' : ''
          }`,
          gap: '0.5rem',
          padding: '0.5rem',
          transition: 'grid-template-columns 0.3s ease',
        }}
      >
        <MusicLibrary
          libraryItems={playlists}
          selectedItem={selectedItem}
          refreshPlaylist={refreshPlaylists}
          onSelectItem={setSelectedItem}
          mainContentView={mainContentView}
          setMainContentView={setMainContentView}
          isMusicLibraryCollapsed={isMusicLibraryCollapsed}
          onToggleMusicLibraryCollapsed={() => setIsMusicLibraryCollapsed(!isMusicLibraryCollapsed)}
        />
        <MainContent
          view={mainContentView}
          selectedPlaylistInfo={selectedPlaylistInfo}
          onReplacePlayQueue={replacePlayQueue}
          onAddToNext={addToNext}
          onAddToNextAndPlay={addToNextAndPlay}
          searchResults={searchResults}
          refreshPlaylists={refreshPlaylists}
          playlists={playlists}
          setSelectedPlaylistInfo={setSelectedPlaylistInfo}
          setMainContentView={setMainContentView}
          playerState={playerStateRef.current}
          setCurrentTime={setCurrentTime}
        />
        {isRightContentVisible && (
          <RightContent
            className="h-full overflow-y-auto"
            playerState={playerStateRef.current}
            clearQueue={clearQueue}
            addToNextAndPlay={addToNextAndPlay}
          />
        )}
      </div>

      {/* 底部播放条 —— 请确保 PlayerBar 组件中没有使用绝对定位或 z-index 强行置顶 */}
      <PlayerBar
        playerState={playerStateRef.current}
        setCurrentTime={setCurrentTime}
        onPlayNext={playNext}
        onPlayPrevious={playPrevious}
        onTogglePlayPause={togglePlayPause}
        onCyclePlaybackMode={cyclePlaybackMode}
        onVolumeChange={setVolume}
        onToggleRightContent={toggleRightContent}
        setMainContentView={setMainContentView}
      />
    </div>
  );
};

export default Application;