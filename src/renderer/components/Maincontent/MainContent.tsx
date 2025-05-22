// file: src/renderer/components/MainContent/MainContent.tsx

import React, { useEffect, useState } from 'react';
import PlaylistView from '@components/Maincontent/PlaylistView/PlaylistView';
import ProfileView from '@components/Maincontent/ProfileView/ProfileView';
import LyricView from '@components/Maincontent/LyricView/LyricView';
import ContentPanel from '@components/ContentPanel/ContentPenal';

import Player from '@renderer/core/player/Player';
import { MainContentViewStack, StackItem, View } from '@components/Maincontent/MainContentViewStack';
import TabbedSearchResultView from '@components/Maincontent/SearchResultView/TabbedSearchResultView';
import DebugView from '@components/Maincontent/DebugView/DebugView';
import { FusionSearchResult } from '@src/shared/domainModel/fusionSearchResult';
import MusicLibraryController from '@renderer/core/MusicLibraryController';

interface MainContentProps {
  player: Player | null;
  viewStack: MainContentViewStack;
  searchResults: FusionSearchResult;
  musicLibraryController: MusicLibraryController;
  /** 内部切换也走导航栈 */
  setMainContentView: (view: View) => void;
}

export default function MainContent({
                                      player,
                                      viewStack,
                                      searchResults,
                                      musicLibraryController,
                                    }: MainContentProps) {


  /** 根据 StackItem 决定渲染哪个视图 */
  const renderView = (item: StackItem): React.ReactNode => {
    switch (item.view) {
      case View.PLAY_LIST:
        return (
          <PlaylistView
            player={player}
            musicLibraryController={musicLibraryController}
          />
        );

      case View.SEARCH_RESULTS:
        return (
          <TabbedSearchResultView
            player={player}
            fusionSearchResult={searchResults}
            viewStack={viewStack}
            musicLibraryController={musicLibraryController}
          />
        );

      case View.PROFILE:
        return <ProfileView />;

      case View.LYRIC:
        if (!player) {
          return (
            <div className="text-center text-red-400 p-4">
              播放器尚未初始化
            </div>
          );
        }
        return <LyricView player={player}
                          viewStack={viewStack}

        />;

      case View.DEBUG:
        return <DebugView player={
          player
        } mainContentStack={
          viewStack
        } />;
      default:
        return (
          <div className="text-center text-gray-500 p-4">
            未知视图：{item.view as string}
          </div>
        );
    }
  };


  // ----------------------

  const [items, setItems] = useState<StackItem[]>(viewStack.getStack());
  const [pointer, setPointer] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = viewStack.subscribe((stack, pointer) => {
      setItems(stack);
      setPointer(pointer);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // ----------------------
  return (
    <ContentPanel className="relative h-full w-full">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="absolute inset-0"
          style={{ display: idx === pointer ? 'block' : 'none' }}
        >
          {renderView(item)}
        </div>
      ))}
    </ContentPanel>
  );
}
