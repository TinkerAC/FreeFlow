// file: src/App.tsx
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './tailwind.css';
import TopBar from '@components/TopBar/TopBar';
import MusicLibrary from '@components/Musiclibrary/Musiclibrary';
import MainContent from '@components/Maincontent/MainContent';
import RightContent from '@components/RightContent/RightContent';
import useMusicLibrary from '@renderer/hooks/useMusiclibrary';
import PlayerBar from '@components/Playerbar/PlayerBar';
import { FusionSearchResult, PlayerState } from '@src/shared/types';
import { playerContext, shortcutContext } from '@main/app/electronContextApi';
import Player from '@components/Player';
import useMainWindow from '@renderer/hooks/useMainWindow';
// 引入新设计的 Player 对象

// 你可能需要在 types 中定义 PlayerState 与 Player 对象状态类型
// 这里假定 PlayerState 与原有状态结构保持一致

const Application: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  // 用于保存 Player 对象实例
  const playerInstanceRef = useRef<Player | null>(null);
  // 使用 React 状态同步播放器状态，以驱动 UI 更新
  const [
    playerState, setPlayerState] = useState<PlayerState>({
    queue: {
      queue: [],
      indexList: [],
      currentIndex: 0,
    },
    volume: 0.5,
    playbackMode: 'loop',
    audioSrc: '',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
  });


  // 歌单、选中项、刷新等逻辑保持不变
  const {
    playlists,
    selectedItem,
    selectedPlaylistInfo,
    setSelectedItem,
    refreshPlaylists,
    setSelectedPlaylistInfo,
  } = useMusicLibrary();

  // 主窗口相关逻辑
  const {
    isMusicLibraryCollapsed,
    setIsMusicLibraryCollapsed,
    isRightContentVisible,
    toggleRightContent,
  } = useMainWindow();

  // 同步搜索结果与主内容视图（这里与原来保持一致）
  const [searchResults, setSearchResults] = useState<FusionSearchResult>({
    tracks: [],
    playlists: [],
  });
  const [mainContentView, setMainContentView] = useState('playlist');

  // 在组件挂载后，初始化 Player 对象
  useEffect(() => {

    const initPlayer = async () => {

      const playerStateDump: PlayerState = await playerContext.getPlayerStateFromMain();
      if (audioRef.current && !playerInstanceRef.current) {
        const player = new Player(audioRef.current);

        // 注册播放器状态更新回调
        player.onStateChange = (state: PlayerState) => {
          setPlayerState(state);
        };
        playerInstanceRef.current = player;

        if (playerStateDump) {

          try {
            await player.loadFromDump(playerStateDump);
          } catch (e) {
            console.log('从dump初始化播放器时候出错');
          }
        }
      }


    };

    initPlayer().then();
  }, [audioRef.current]);

  // 注册播放器与快捷键、通知等的 IPC 监听
  useEffect(() => {
    // 注册回调函数——这里 dumpPlayerState 可调用 playerInstance 的方法
    const handleRequestPlayerState = () => {
      if (playerInstanceRef.current) {
        const state = playerInstanceRef.current.dumpPlayerState();
        playerContext.sendPlayerState(state);
      }
    };
    const handleNotification = (message: string) => {
      alert(message);
    };
    const handleShortcut = (data: string) => {
      if (!playerInstanceRef.current) return;
      switch (data) {
        case 'prev':
          playerInstanceRef.current.playPrevious().then();
          break;
        case 'next':
          playerInstanceRef.current.playNext().then();
          break;
        case 'play-pause':
          playerInstanceRef.current.togglePlayPause();
          break;
        case 'volume-up':
          playerInstanceRef.current.changeVolume(0.1);
          break;
        case 'volume-down':
          playerInstanceRef.current.changeVolume(-0.1);
          break;
        default:
          console.log('未知快捷键操作');
      }
    };

    playerContext.onRequestPlayerState(handleRequestPlayerState);
    shortcutContext.onShortcut(handleShortcut);
    playerContext.onNotification(handleNotification);
    return () => {
      playerContext.removeRequestPlayerStateListener();
      shortcutContext.removeShortcutListener();
      console.log('已移除所有 IPC 监听器');
    };
  }, []);

  // 同步音频元数据
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      const handleLoadedMetadata = () => {
        if (playerInstanceRef.current) {
          // 这里直接调用 Player 的方法设置时长
          // 假设 setCurrentTrackInfoDuration 方法已经内置在 Player 对象中
          playerInstanceRef.current.setCurrentTime(audioElement.duration);
        }
      };
      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [playerState.audioSrc]);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  //used for front-end debug
  window.playerState = playerState;

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  window.player = playerInstanceRef.current;

  return (
    <div className="App h-full w-full flex flex-col bg-black flex-direction: column">
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} hidden />

      {/* 顶部导航 */}
      <TopBar
        onSwitchView={setMainContentView}
        currentView={mainContentView}
        setSearchResults={setSearchResults}
      />

      {/* 主内容区域 */}
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
          player={playerInstanceRef.current}
          selectedPlaylistInfo={selectedPlaylistInfo}
          searchResults={searchResults}
          refreshPlaylists={refreshPlaylists}
          playlists={playlists}
          setSelectedPlaylistInfo={setSelectedPlaylistInfo}
          setMainContentView={setMainContentView}

        />
        {isRightContentVisible && (
          <RightContent
            className="h-full overflow-y-auto"
            player={playerInstanceRef.current}
          />
        )}
      </div>

      {/* 底部播放条 */}
      <PlayerBar
        player={playerInstanceRef.current}
        onToggleRightContent={
          toggleRightContent
        }
        setMainContentView={setMainContentView}
      />
    </div>
  );
};

export default Application;
