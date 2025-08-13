import React, { useEffect, useState } from 'react';
import { MainContentViewStack, StackItem, View } from './MainContentViewStack';
import PlaylistView from './PlaylistView/PlaylistView';
import ProfileView from './ProfileView/ProfileView';
import LyricView from './LyricView/LyricView';
import SearchResultView from './SearchResultView/SearchResultView';
import DebugView from './DebugView/DebugView';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import SettingsView from '@components/Maincontent/SettingView/SettingsView';

export default function MainContentSwitch({
                                            player, viewStack, searchResults, musicLibraryController, keepAlive = false,
                                          }: {
  player: PlayerController | null;
  viewStack: MainContentViewStack;
  searchResults: FusionSearchResult;
  musicLibraryController: MusicLibraryController;
  keepAlive?: boolean;
}) {
  const [items, setItems] = useState<StackItem[]>(viewStack.getStack());
  const [pointer, setPointer] = useState(0);

  useEffect(() => {
    const unsub = viewStack.subscribe((stack, p) => {
      setItems(stack);
      setPointer(p);
    });
    return () => unsub();
  }, [viewStack]);

  const render = (item: StackItem) => {
    switch (item.view) {
      case View.PLAY_LIST:
        return <PlaylistView player={player!} musicLibraryController={musicLibraryController} />;
      case View.SEARCH_RESULTS:
        return (
          <SearchResultView
            player={player}
            fusionSearchResult={searchResults}
            viewStack={viewStack}
            musicLibraryController={musicLibraryController}
          />
        );
      case View.PROFILE:
        return <ProfileView />;
      case View.LYRIC:
        return player ? <LyricView player={player} /> :
          <div style={{ padding: 16, color: '#f87171' }}>播放器未就绪</div>;
      case View.DEBUG:
        return <DebugView player={player!} mainContentStack={viewStack} />;
      case View.SETTINGS:
        return <SettingsView />;
      default:
        return <div style={{ padding: 16, opacity: .7 }}>未知视图</div>;
    }
  };

  if (!keepAlive) {
    const cur = items[pointer];
    return <>{cur && render(cur)}</>;
  }

  return (
    <>
      {items.map((it, i) => {
        const active = i === pointer;
        return (
          <section
            key={i}
            hidden={!active}
            {...(!active ? { inert: '' as any } : {})}
            style={{ height: '100%', contentVisibility: active ? 'auto' : 'hidden' }}
          >
            {render(it)}
          </section>
        );
      })}
    </>
  );
}
