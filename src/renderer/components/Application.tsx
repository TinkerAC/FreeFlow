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
import { NavigationProvider, ViewType } from '@renderer/core/navigation';
import MainContentSwitch from '@components/Maincontent/MainContentSwitch';

const ApplicationContent: React.FC = () => {
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
      if (player) { playerContext.broadcastState(player.dumpPlayerState()); }
    };
    const handleDumpReq = () => {
      const player = playerInstanceRef.current;
      if (player) {
        try { playerContext.sendPlayerState(player.dumpPlayerState()); } catch {}
      } else {
        // 即使播放器未初始化，仍回一个空状态，避免主进程卡住
        try { playerContext.sendPlayerState({
          queue: { queue: [], indexList: [], currentIndex: 0 },
          volume: 0.5,
          playbackMode: PlaybackMode.LOOP,
          audioSrc: '',
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
        }); } catch {}
      }
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
    // 单独监听“退出保存”请求
    const offDump = (playerContext as any).onDumpRequest?.(handleDumpReq);
    shortcutContext.onShortcut(handleShortcut);
    playerContext.onNotification(handleNotif);
    return () => {
      playerContext.removeRequestPlayerStateListener();
      try { offDump?.(); } catch {}
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
      const push = () => {
        try { playerContext.broadcastState(p.dumpPlayerState()); } catch {}
      };
      switch (cmd) {
        case 'play': p.play(); push(); break;
        case 'pause': p.pause(); push(); break;
        case 'toggle': p.togglePlayPause(); push(); break;
        case 'next': { const pr = p.playNext(); push(); pr.finally(push); break; }
        case 'prev': { const pr = p.playPrevious(); push(); pr.finally(push); break; }
        case 'seek': if (typeof payload === 'number') { p.setCurrentTime(payload); push(); } break;
        case 'setVolume': if (typeof payload === 'number') { p.setVolume(payload); push(); } break;
      }
    });
    return () => { offControl?.(); };
  }, [isMini]);

  // 注意：不要在 loadedmetadata 时强行设置 currentTime = duration，
  // 这会覆盖从 dump 恢复的进度。保留由 PlayerController 自行恢复/管理。

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
              <MainContentSwitch
                player={playerInstanceRef.current}
                searchResults={searchResults}
                musicLibraryController={musicServiceRef.current!}
                keepAlive={false}
              />
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

// Wrap with NavigationProvider
const Application: React.FC = () => {
  return (
    <NavigationProvider initialView={ViewType.PLAYLIST}>
      <ApplicationContent />
    </NavigationProvider>
  );
};

export default Application;
