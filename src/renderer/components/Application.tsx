// file: src/App.tsx

import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './tailwind.css';

import TopBar from '@components/TopBar/TopBar';
import MusicLibrary from '@components/Musiclibrary/Musiclibrary';
import MainContent from '@components/Maincontent/MainContent';
import RightContent from '@components/RightContent/RightContent';
import PlayerBar from '@components/Playerbar/PlayerBar';

import useMusicLibrary from '@renderer/hooks/useMusiclibrary';
import useMainWindow from '@renderer/hooks/useMainWindow';

import { FusionSearchResult, PlayerState } from '@src/shared/types';
import { playerContext, shortcutContext } from '@main/app/electronContextApi';
import Player from '@components/Player';

import { MainContentViewStack, ViewName } from '@components/Maincontent/MainContentViewStack';

const Application: React.FC = () => {
  // === 1. 实例化导航栈 ===
  const viewStackRef = useRef(
    new MainContentViewStack({ view: 'playlist' as ViewName }),
  );

  // 本地 state：整个栈和指针，用于触发渲染
  const [stack, setStack] = useState(viewStackRef.current.getStack());
  const [pointer, setPointer] = useState(viewStackRef.current.getPointer());

  // === 2. 订阅导航栈变化 ===
  useEffect(() => {
    return viewStackRef.current.subscribe((s, p) => {
      setStack(s);
      setPointer(p);
    });
  }, []);

  // === 3. 播放器逻辑 ===
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerInstanceRef = useRef<Player | null>(null);

  const [playerState, setPlayerState] = useState<PlayerState>({
    queue: { queue: [], indexList: [], currentIndex: 0 },
    volume: 0.5,
    playbackMode: 'loop',
    audioSrc: '',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
  });

  // 初始化播放器并恢复状态
  useEffect(() => {
    const initPlayer = async () => {
      const dump = await playerContext.getPlayerStateFromMain();
      if (audioRef.current && !playerInstanceRef.current) {
        const player = new Player(audioRef.current);
        player.onStateChange = (st) => setPlayerState(st);
        playerInstanceRef.current = player;
        if (dump) {
          try {
            await player.loadFromDump(dump);
          } catch (e) {
            console.error('从 dump 初始化播放器失败', e);
          }
        }
      }
    };
    initPlayer();
  }, [audioRef.current]);

  // IPC 监听：状态请求、快捷键、通知
  useEffect(() => {
    const handleReqState = () => {
      const player = playerInstanceRef.current;
      if (player) playerContext.sendPlayerState(player.dumpPlayerState());
    };
    const handleShortcut = (data: string) => {
      const player = playerInstanceRef.current;
      if (!player) return;
      switch (data) {
        case 'prev':
          player.playPrevious();
          break;
        case 'next':
          player.playNext();
          break;
        case 'play-pause':
          player.togglePlayPause();
          break;
        case 'volume-up':
          player.changeVolume(0.1);
          break;
        case 'volume-down':
          player.changeVolume(-0.1);
          break;
      }
    };
    const handleNotif = (msg: string) => alert(msg);

    playerContext.onRequestPlayerState(handleReqState);
    shortcutContext.onShortcut(handleShortcut);
    playerContext.onNotification(handleNotif);

    return () => {
      playerContext.removeRequestPlayerStateListener();
      shortcutContext.removeShortcutListener();
      playerContext.removeRequestPlayerStateListener();
    };
  }, []);

  // 同步元数据加载后的时长
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => {
      playerInstanceRef.current?.setCurrentTime(audio.duration);
    };
    audio.addEventListener('loadedmetadata', onLoaded);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
    };
  }, [playerState.audioSrc]);

  // === 4. 歌单 & 搜索 相关 ===
  const {
    playlists,
    selectedItem,
    selectedPlaylistInfo,
    setSelectedItem,
    refreshPlaylists,
    setSelectedPlaylistInfo,
  } = useMusicLibrary();

  const {
    isMusicLibraryCollapsed,
    setIsMusicLibraryCollapsed,
    isRightContentVisible,
    toggleRightContent,
  } = useMainWindow();

  const [searchResults, setSearchResults] = useState<FusionSearchResult>({
    tracks: [],
    playlists: [],
  });

  return (
    <div className="App h-full w-full flex flex-col bg-black">
      <audio ref={audioRef} hidden />

      {/* 顶部导航：委托给导航栈 */}
      <TopBar
        setSearchResults={setSearchResults}
        mainContentViewStack={viewStackRef.current}
      />

      {/* 主体区域 */}
      <div
        className="flex-1 overflow-hidden grid"
        style={{
          gridTemplateColumns: `${
            isMusicLibraryCollapsed ? '72px' : '250px'
          } minmax(416.67px, 1fr) ${
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
          mainContentView={stack[pointer].view}
          setMainContentView={(view: ViewName) =>
            viewStackRef.current.navigate(view)
          }
          isMusicLibraryCollapsed={isMusicLibraryCollapsed}
          onToggleMusicLibraryCollapsed={() =>
            setIsMusicLibraryCollapsed(!isMusicLibraryCollapsed)
          }
        />

        <MainContent
          stack={stack}
          pointer={pointer}
          player={playerInstanceRef.current}
          selectedPlaylistInfo={selectedPlaylistInfo}
          setSelectedPlaylistInfo={setSelectedPlaylistInfo}
          searchResults={searchResults}
          refreshPlaylists={refreshPlaylists}
          playlists={playlists}
          setMainContentView={(view: ViewName) =>
            viewStackRef.current.navigate(view)
          }
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
        onToggleRightContent={toggleRightContent}
        mainContentStack={viewStackRef.current}
      />
    </div>

  );
};

export default Application;