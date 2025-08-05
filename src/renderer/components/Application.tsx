// src/renderer/components/Application.tsx
import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import './tailwind.css';
import ReactPlayer from 'react-player'
import TopBar from '@components/TopBar/TopBar';
import MusicLibrary from '@components/Musiclibrary/Musiclibrary';
import MainContent from '@components/Maincontent/MainContent';
import PlayerBar from '@components/Playerbar/PlayerBar';

import { playerContext, shortcutContext } from '@renderer/core/electronContextApi';
import PlayerController from '@renderer/core/controller/PlayerController';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import { PlayerState } from '@src/shared/domainModel/playerState';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import chalk from 'chalk';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import MainWindowController from '@renderer/core/controller/MainWindowController';
import { PlaybackMode } from '@renderer/core/enum/PlaybackMode';
import RightDrawer from '@components/RightContent/RightDrawer';
import { AnimatePresence } from 'framer-motion';

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

  const viewStackRef = useRef<MainContentViewStack | null>(null);
  if (viewStackRef.current === null) {
    viewStackRef.current = new MainContentViewStack({ view: 'playlist' as View });
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
    const initPlayer = async () => {


      const dump = await playerContext.getPlayerStateFromMain();
      if (audioRef.current && !playerInstanceRef.current) {
        const player = new PlayerController(audioRef.current);

        player.subscribe((st: PlayerState) => {
          setPlayerState(st);
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
  }, [audioRef.current]);

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
  }, []);

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
  return (
    <div className="App h-full w-full flex flex-col bg-black">
      <audio ref={audioRef} hidden />
      <TopBar
        setSearchResults={setSearchResults}
        mainContentViewStack={viewStackRef.current!}
        player={playerInstanceRef.current}
      />

      <div
        className="flex-1 overflow-hidden grid"
        style={{
          gridTemplateColumns: `${
            isMusicLibraryCollapsed ? '72px' : '250px'
          } minmax(416.67px, 1fr) ${isRightContentVisible ? 'minmax(0, 300px)' : ''}`,
          gap: '0.5rem',
          padding: '0.5rem',
          transition: 'grid-template-columns 0.3s ease',
        }}
      >
        <MusicLibrary
          viewStack={viewStackRef.current}
          musicLibraryController={musicServiceRef.current!} />

        <MainContent
          viewStack={viewStackRef.current!}
          player={playerInstanceRef.current}
          musicLibraryController={musicServiceRef.current!}
          searchResults={searchResults}
          setMainContentView={(v: View) => viewStackRef.current!.navigate(v)}
        />

        {/* ---------- 右侧抽屉 ---------- */}
        <AnimatePresence>
          <RightDrawer
            key="right-drawer"
            visible={isRightContentVisible}
            player={playerInstanceRef.current}
          />
        </AnimatePresence>

      </div>
      <PlayerBar
        player={playerInstanceRef.current}
        onToggleRightContent={() => mainWindowServiceRef.current!.toggleRightContent()}
        mainContentStack={viewStackRef.current!}
      />
    </div>
  );
};

export default Application;