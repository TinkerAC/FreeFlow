// src/renderer/components/Application.tsx
import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './App.css';
import './tailwind.css';

// Components
import AppFrame from '@renderer/layout/AppFrame/AppFrame';
import ContentGrid from '@renderer/layout/ContentGrid/ContentGrid';
import TopBar from '@renderer/windows/main/TopBar/TopBar';
import MusicLibrary from '@renderer/windows/main/Musiclibrary/Musiclibrary';
import PlayerBar from '@renderer/windows/main/Playerbar/PlayerBar';
import MainContentSwitch from '@renderer/windows/main/Maincontent/MainContentSwitch';
import RightDock from '@renderer/windows/main/RightContent/RightDock';
import RightContent from '@renderer/windows/main/RightContent/RightContent';
import MiniPlayer from '@renderer/windows/MiniPlayer/MiniPlayer';
import { NavigationProvider, ViewType } from '@renderer/core/navigation';

// Controllers & Models
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import MainWindowController from '@renderer/core/controller/MainWindowController';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';

// Hooks (New!)
import { usePlayerFactory } from '@renderer/hooks/usePlayerFactory';
import { useIpcBridge } from '@renderer/hooks/useIPCBridge';

import { ensureWeb3Modal } from '@renderer/core/web3/bootstrap';

ensureWeb3Modal();

const ApplicationContent: React.FC = () => {
  const location = useLocation();
  const isMini = location.pathname === '/mini';

  

  /* ---------- 1. 服务实例化 ---------- */
  // 使用 Ref 保持单例
  const musicServiceRef = useRef<MusicLibraryController | null>(null);
  if (!musicServiceRef.current) {
    musicServiceRef.current = new MusicLibraryController();
  }
  const mainWindowServiceRef = useRef<MainWindowController | null>(null);
  if (!mainWindowServiceRef.current) {
    mainWindowServiceRef.current = new MainWindowController();
  }

  const musicLibraryController = musicServiceRef.current!;
  const mainWindowController = mainWindowServiceRef.current!;

  /* ---------- 2. UI 状态绑定 ---------- */
  // 这里也可以进一步封装成 useMainWindowState(service)
  const [isMusicLibraryCollapsed, setIsMusicLibraryCollapsed] = useState(
    musicLibraryController.isMusicLibraryCollapsed,
  );
  const [isRightContentVisible, setIsRightContentVisible] = useState(
    mainWindowController.isRightContentVisible,
  );

  // 简单的订阅逻辑（如果想进一步解耦，可以把这个 useEffect 也移出去）
  React.useEffect(() => {
    const unsubMain = mainWindowController.subscribe(() =>
      setIsRightContentVisible(mainWindowController.isRightContentVisible),
    );
    const unsubMusic = musicLibraryController.subscribe(() =>
      setIsMusicLibraryCollapsed(musicLibraryController.isMusicLibraryCollapsed),
    );
    return () => {
      unsubMain();
      unsubMusic();
    };
  }, [mainWindowController, musicLibraryController]);

  /* ---------- 3. 播放器核心逻辑 (解耦后) ---------- */
  const audioRef = useRef<HTMLAudioElement>(null);

  // A. 创建播放器
  const { playerInstance, playerState } = usePlayerFactory(audioRef, isMini);

  // B. 绑定 IPC 通信 (当 playerInstance 准备好后自动生效)
  useIpcBridge(playerInstance, isMini);

  /* ---------- 4. 搜索结果状态 ---------- */
  const [searchResults, setSearchResults] = useState<FusionSearchResult>({
    track_result: [],
    playlist_result: [],
  });

  /* ---------- 5. 渲染视图 ---------- */
  if (isMini) {
    return (
      <div className="App h-full w-full flex flex-col bg-transparent">
        <MiniPlayer player={null} />
      </div>
    );
  }

  return (
    <div className="App h-full w-full flex flex-col">
      <audio ref={audioRef} hidden preload="auto" />

      <AppFrame
        top={
          <TopBar
            setSearchResults={setSearchResults}
            player={playerInstance} // 注意：现在直接传实例，不再依赖 Ref.current 的不确定性
          />
        }
        content={
          <ContentGrid
            sidebarCollapsed={isMusicLibraryCollapsed}
            rightVisible={isRightContentVisible}
            left={
              <MusicLibrary musicLibraryController={musicLibraryController} />
            }
            main={
              <MainContentSwitch
                player={playerInstance}
                searchResults={searchResults}
                musicLibraryController={musicLibraryController}
                keepAlive={false}
              />
            }
            right={
              <RightDock>
                <RightContent player={playerInstance} />
              </RightDock>
            }
          />
        }
        bottom={
          <PlayerBar
            player={playerInstance}
            onToggleRightContent={() => mainWindowController.toggleRightContent()}
          />
        }
      />
    </div>
  );
};

const Application: React.FC = () => {
  return (
    <NavigationProvider initialView={ViewType.PLAYLIST}>
      <ApplicationContent />
    </NavigationProvider>
  );
};

export default Application;
