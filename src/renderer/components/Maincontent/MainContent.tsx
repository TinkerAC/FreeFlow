// file: src/renderer/components/MainContent/MainContent.tsx

import React from 'react';
import NetSearchResultView from '@components/Maincontent/SearchResultView/SearchResultView';
import PlaylistView from '@components/Maincontent/PlaylistView/PlaylistView';
import ProfileView from '@components/Maincontent/ProfileView/ProfileView';
import LyricView from '@components/Maincontent/LyricView/LyricView';
import ContentPanel from '@components/ContentPanel/ContentPenal';

import { FusionSearchResult, PlaylistModel } from '@src/shared/types';
import Player from '@components/Player';
import { StackItem, ViewName } from '@components/Maincontent/MainContentViewStack';

interface MainContentProps {
  /** 来自 App 的完整视图栈 */
  stack: StackItem[];
  /** 来自 App 的当前指针 */
  pointer: number;

  player: Player | null;

  selectedPlaylistInfo: PlaylistModel;
  setSelectedPlaylistInfo: (playlist: PlaylistModel) => void;

  searchResults: FusionSearchResult;
  refreshPlaylists: () => void;
  playlists: PlaylistModel[];

  /** 内部切换也走导航栈 */
  setMainContentView: (view: ViewName) => void;
}

export default function MainContent({
                                      stack,
                                      pointer,
                                      player,
                                      selectedPlaylistInfo,
                                      setSelectedPlaylistInfo,
                                      searchResults,
                                      refreshPlaylists,
                                      playlists,
                                      setMainContentView,
                                    }: MainContentProps) {
  return (
    <ContentPanel className="relative h-full w-full">
      {stack.map((item, idx) => {
        let Comp: React.ReactNode = null;
        switch (item.view) {
          case 'playlist':
            Comp = (
              <PlaylistView
                playListInfo={selectedPlaylistInfo}
                player={player}
                refreshPlaylist={refreshPlaylists}
                playlists={playlists}
              />
            );
            break;
          case 'searchResults':
            Comp = (
              <NetSearchResultView
                player={player}
                refreshPlaylists={refreshPlaylists}
                fusionSearchResult={searchResults}
                onSelectOnlinePlaylist={(pl) => {
                  setSelectedPlaylistInfo(pl);
                  setMainContentView(ViewName.PLAY_LIST);
                }}
                setMainContentView={setMainContentView}
                savedPlaylists={playlists}
              />
            );
            break;
          case 'profile':
            Comp = <ProfileView />;
            break;
          case 'lyric':
            Comp = <LyricView player={player} />;
            break;
          default:
            Comp = (
              <div className="text-center text-gray-500 p-4">
                未知视图：{item.view}
              </div>
            );
        }

        return (
          <div
            key={idx}
            className="absolute inset-0"
            style={{ display: idx === pointer ? 'block' : 'none' }}
          >
            {Comp}
          </div>
        );
      })}
    </ContentPanel>
  );
}