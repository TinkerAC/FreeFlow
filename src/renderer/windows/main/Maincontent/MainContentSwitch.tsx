import React from 'react';
import { useNavigation, ViewType } from '@renderer/core/navigation';
import PlaylistView from './PlaylistView/PlaylistView';
import ProfileView from './ProfileView/ProfileView';
import LyricView from './LyricView/LyricView';
import SearchResultView from './SearchResultView/SearchResultView';
import DebugView from './DebugView/DebugView';
import TrackDetailView from './TrackDetailView/TrackDetailView';
import PlayerController from '@renderer/core/controller/PlayerController';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import SettingsView from '@renderer/windows/main/Maincontent/SettingView/SettingsView';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

interface MainContentSwitchProps {
  player: PlayerController | null;
  searchResults: FusionSearchResult;
  musicLibraryController: MusicLibraryController;
  keepAlive?: boolean;
}

export default function MainContentSwitch({
  player,
  searchResults,
  musicLibraryController,
  keepAlive = false,
}: MainContentSwitchProps) {
  const { currentEntry, history, currentIndex } = useNavigation();

  const render = (entry: ReturnType<typeof useNavigation>['currentEntry']) => {
    if (!entry)
      return <div style={{ padding: 16, opacity: 0.7 }}>加载中...</div>;

    switch (entry.view) {
      case ViewType.PLAYLIST:
        return player ? (
          <PlaylistView
            player={player}
            musicLibraryController={musicLibraryController}
          />
        ) : <div style={{ padding: 16 }}>加载中...</div>;
      case ViewType.SEARCH_RESULTS:
        return player ? (
          <SearchResultView
            player={player}
            fusionSearchResult={searchResults}
            musicLibraryController={musicLibraryController}
          />
        ) : <div style={{ padding: 16 }}>加载中...</div>;
      case ViewType.PROFILE:
        return <ProfileView />;
      case ViewType.LYRIC:
        return player ? <LyricView player={player} /> : <div style={{ padding: 16 }}>加载中...</div>;
      case ViewType.DEBUG:
        return player ? <DebugView player={player} /> : <div style={{ padding: 16 }}>加载中...</div>;
      case ViewType.SETTINGS:
        return <SettingsView />;
      case ViewType.TRACK_DETAIL:
        return entry.data && player ? (
          <TrackDetailView
            track={entry.data as TrackEntity}
            player={player}
            musicLibraryController={musicLibraryController}
          />
        ) : (
          <div style={{ padding: 16, color: '#f87171' }}>无歌曲数据</div>
        );
      default:
        return <div style={{ padding: 16, opacity: 0.7 }}>未知视图</div>;
    }
  };

  if (!keepAlive) {
    return <>{render(currentEntry)}</>;
  }

  return (
    <>
      {history.map((entry, i) => {
        const active = i === currentIndex;
        return (
          <section
            key={entry.id}
            hidden={!active}
            {...(!active ? { inert: '' as any } : {})}
            style={{
              height: '100%',
              contentVisibility: active ? 'auto' : 'hidden',
            }}
          >
            {render(entry)}
          </section>
        );
      })}
    </>
  );
}
