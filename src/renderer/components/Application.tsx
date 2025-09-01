// src/renderer/components/Application.tsx
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './tailwind.css';
import TopBar from '@components/TopBar/TopBar';
import MusicLibrary from '@components/Musiclibrary/Musiclibrary';
import PlayerBar from '@components/Playerbar/PlayerBar';
import { playerContext, shortcutContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import chalk from 'chalk';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import MainWindowController from '@renderer/core/controller/MainWindowController';
import { PlaybackMode } from '@renderer/core/enum/PlaybackMode';
import AppFrame from '@renderer/layout/AppFrame/AppFrame';
import ContentGrid from '@renderer/layout/ContentGrid/ContentGrid';
import RightContent from '@components/RightContent/RightContent';
import RightDock from '@components/RightContent/RightDock';
import PlaylistView from '@components/Maincontent/PlaylistView/PlaylistView';
import SearchResultView from '@components/Maincontent/SearchResultView/SearchResultView';
import ProfileView from '@components/Maincontent/ProfileView/ProfileView';
import LyricView from '@components/Maincontent/LyricView/LyricView';
import DebugView from '@components/Maincontent/DebugView/DebugView';
import SettingsView from '@components/Maincontent/SettingView/SettingsView';
import MiniPlayer from '@components/MiniPlayer/MiniPlayer';

const Application: React.FC = () => {
  /* ---------- 1. 实例化服务和导航栈（惰性初始化） ---------- */
  const musicServiceRef = useRef<MusicLibraryController | null>(null);
  if (musicServiceRef.current === null) {
    musicServiceRef.current = new MusicLibraryController();
  }

  const mainWindowServiceRef = useRef<MainWindowController | null>(null);
  if (mainWindowServiceRef.current === null) {
    mainWindowServiceRef.current = new MainWindowController();
  }

  /* ---------- 3. 绑定 MainWindowController 状态 ---------- */
  const [isMusicLibraryCollapsed, setIsMusicLibraryCollapsed] = useState(
    musicServiceRef.current.isMusicLibraryCollapsed,
  );
  const [isRightContentVisible, setIsRightContentVisible] = useState(
    mainWindowServiceRef.current.isRightContentVisible,
  );

  useEffect(() => {
    const unsub = mainWindowServiceRef.current!.subscribe(() => {
      setIsRightContentVisible(mainWindowServiceRef.current!.isRightContentVisible);
    });

    return () => {
      unsub();
      mainWindowServiceRef.current!.dispose();
    };
  }, []);

  useEffect(() => {
    const unsub = musicServiceRef.current!.subscribe(() => {
      setIsMusicLibraryCollapsed(musicServiceRef.current!.isMusicLibraryCollapsed);
    });
    return () => {
      unsub();
    };
  }, []);

  /* ---------- 5. 播放器逻辑 ---------- */
  const location = useLocation();
  const isMini = location.pathname === '/mini';
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerInstanceRef = useRef<PlayerController | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>({
    queue: { queue: [], indexList: [], currentIndex: 0 },
    volume: 0.5,
    playbackMode: PlaybackMode.LOOP,
    audioSrc: '',
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
  });


  useEffect(() => {
    if (isMini) return; // 单持有者：迷你窗口不创建播放器
    const initPlayer = async () => {
      const dump = await playerContext.getPlayerStateFromMain();
      if (audioRef.current && !playerInstanceRef.current) {
        const player = new PlayerController(audioRef.current);

        player.subscribe((st: PlayerState) => {
          setPlayerState(st);
          // 向主进程广播实时状态，供 Mini 订阅
          playerContext.broadcastState(st);
        });

        playerInstanceRef.current = player;
        if (dump) {
          try {
            await player.loadFromDump(dump);
          } catch (e) {
            console.error('从 dump 初始化播放器失败', e);
          }
        }
        console.log(chalk.green('播放器初始化完成!'));
      }
    };
    initPlayer().then(
      () => console.info(chalk.green('播放器初始化成功')),
    );
  }, [audioRef.current, isMini]);

  useEffect(() => {
    if (isMini) return;
    const handleReqState = () => {
      const player = playerInstanceRef.current;
      if (player) playerContext.broadcastState(player.dumpPlayerState());
    };
    const handleShortcut = (data: string) => {
      const player = playerInstanceRef.current;
      if (!player) return;
      switch (data) {
        case 'prev':
          player.playPrevious().then(() => console.info(chalk.green('播放上一首成功')));
          break;
        case 'next':
          player.playNext().then(() => console.info(chalk.green('播放下一首成功')));
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
  }, [isMini]);

  // 接收来自主进程的控制命令，仅主窗口处理
  useEffect(() => {
    if (isMini) return;
    const offControl = window.mainApi.playerApi.onControl((cmd: string, payload: any) => {
      const p = playerInstanceRef.current;
      if (!p) return;
      switch (cmd) {
        case 'play': p.play(); break;
        case 'pause': p.pause(); break;
        case 'toggle': p.togglePlayPause(); break;
        case 'next': p.playNext(); break;
        case 'prev': p.playPrevious(); break;
        case 'seek': if (typeof payload === 'number') p.setCurrentTime(payload); break;
        case 'setVolume': if (typeof payload === 'number') p.setVolume(payload); break;
      }
    });
    return () => { offControl?.(); };
  }, [isMini]);

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

  /* ---------- 6. 搜索结果 ---------- */
  const [searchResults, setSearchResults] = useState<FusionSearchResult>({
    track_result: [],
    playlist_result: [],
  });

  /* ---------- 7. UI ---------- */
  if (isMini) {
    return (
      <div className="App h-full w-full flex flex-col bg-transparent">
        {/* 单持有者：迷你窗口不挂载 <audio>，不创建 PlayerController */}
        <MiniPlayer player={null} />
      </div>
    );
  }

  return (
    <div className="App h-full w-full flex flex-col bg-black">
      <audio ref={audioRef} hidden preload="auto" />

      <AppFrame
        top={
          <TopBar
            setSearchResults={setSearchResults}
            player={playerInstanceRef.current}
          />
        }
        content={
          <ContentGrid
            sidebarCollapsed={isMusicLibraryCollapsed}
            rightVisible={isRightContentVisible}
            left={
              <MusicLibrary
                musicLibraryController={musicServiceRef.current!}
              />
            }
            main={
              <div className="h-full">
                <div className="h-full">
                  <Routes>
                    <Route path="/" element={<Navigate to="/playlist" replace />} />
                    <Route path="/playlist" element={<PlaylistView player={playerInstanceRef.current!} musicLibraryController={musicServiceRef.current!} />} />
                    <Route path="/search" element={<SearchResultView player={playerInstanceRef.current!} fusionSearchResult={searchResults} musicLibraryController={musicServiceRef.current!} />} />
                    <Route path="/profile" element={<ProfileView />} />
                    <Route path="/lyric" element={playerInstanceRef.current ? <LyricView player={playerInstanceRef.current} /> : <div style={{ padding: 16, color: '#f87171' }}>播放器未就绪</div>} />
                    <Route path="/debug" element={<DebugView player={playerInstanceRef.current!} />} />
                  <Route path="/settings-app" element={<SettingsView />} />
                  <Route path="/mini" element={<MiniPlayer player={playerInstanceRef.current} />} />
                  <Route path="*" element={<div style={{ padding: 16 }}>未找到页面</div>} />
                </Routes>
                </div>
              </div>
            }
            right={
              <RightDock>
                <RightContent player={playerInstanceRef.current} />
              </RightDock>
            }
          />
        }
        bottom={
          <PlayerBar
            player={playerInstanceRef.current}
            onToggleRightContent={() => mainWindowServiceRef.current!.toggleRightContent()}
          />
        }
      />
    </div>
  );


};
export default Application;
