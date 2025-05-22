import React, { useState } from 'react';
import useStateRef from 'react-usestateref';
import Player from '@renderer/core/player/Player';
import TabNav, { TabKey } from './TabNav';

import ContextMenu from '@components/Maincontent/SearchResultView/ContextMenu';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import PlaylistsTab from '@components/Maincontent/SearchResultView/PlaylistTab';
import TracksTab from '@components/Maincontent/SearchResultView/TrackTab';
import PopularTab from '@components/Maincontent/SearchResultView/PopularTab';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { FusionSearchResult } from '@src/shared/domainModel/fusionSearchResult';
import { MainContentViewStack } from '@components/Maincontent/MainContentViewStack';
import MusicLibraryController from '@renderer/core/MusicLibraryController';

export interface TabbedSearchResultViewProps {
  /** 外部可选：初始激活的 Tab */
  initialTab?: TabKey;

  /** 综合搜索结果 */
  fusionSearchResult: FusionSearchResult | null;

  viewStack: MainContentViewStack;

  musicLibraryController: MusicLibraryController;

  /** 播放器实例 */
  player: Player;
}

/**
 * 将原先的瀑布流式布局改造为 Tab 分栏布局。
 * 支持外部设置初始 Tab，也支持通过 `onTabChange` 获取当前选中的 tab。
 */
function TabbedSearchResultView({
                                  initialTab = 'popular',
                                  fusionSearchResult,
                                  player,
                                  viewStack,
                                  musicLibraryController,
                                }: TabbedSearchResultViewProps) {
  // ----------------------
  // tab state
  // ----------------------
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // ----------------------
  // context-menu state
  // ----------------------
  const [contextMenu, setContextMenu] = useStateRef<{ x: number; y: number } | null>(null);
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackEntity | null>(null);

  //---------------------------------------
  // 还未搜索
  //---------------------------------------
  if (!fusionSearchResult) {
    return (
      <div className="text-center text-gray-500 text-xl p-4">请输入关键词进行搜索...</div>
    );
  }

  // 解构并赋默认空数组，避免未定义时报错
  const {
    track_result = [],
    playlist_result = [],
  } = fusionSearchResult;


  const popularResult = track_result[0];
  //
  // //---------------------------------------
  // // 无搜索结果
  // //---------------------------------------
  // if (track_result.length === 0 && playlist_result.length === 0) {
  //   return (
  //     <div className="text-center text-gray-500 text-xl p-4">没有搜索结果，请尝试其他关键词。</div>
  //   );
  // }

  //---------------------------------------
  // 右键菜单逻辑
  //---------------------------------------
  const openContextMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    track: TrackEntity,
  ) => {
    e.preventDefault();
    setSelectedTrack(track);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setSelectedTrack(null);
  };

  return (
    <div className="relative p-4">
      {/* ---------- Tabs ---------- */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ---------- Tab Content ---------- */}
      <div className="mt-6">
        {activeTab === 'popular' && (
          <PopularTab
            track={popularResult}
            player={player}
            onContextMenu={openContextMenu}
          />
        )}

        {activeTab === 'tracks' && (
          <TracksTab
            tracks={track_result}
            player={player}
            onContextMenu={openContextMenu}
          />
        )}

        {activeTab === 'playlists' && (
          <PlaylistsTab
            playlists={playlist_result}
            musicLibraryController={musicLibraryController}
            viewStack={viewStack}
          />
        )}
      </div>

      {/* ---------- 右键菜单 ---------- */}
      {contextMenu && selectedTrackRef.current && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={selectedTrackRef.current}
          player={player}
          addToLibrary={(track) => libraryContext.addTrackToLibrary(track).then(musicLibraryController.refreshPlaylists)}
          addTrackToPlaylist={(track, playlist_id) =>
            playlistContext.addTrackToPlaylist(track, playlist_id).then(musicLibraryController.refreshPlaylists)
          }
          playlists={musicLibraryController.playlists}
          handleCloseMenu={closeContextMenu}
        />
      )}

      {/* 点击空白处关闭菜单 */}
      {contextMenu && <div className="fixed inset-0 z-50" onClick={closeContextMenu} />}
    </div>
  );
}

export default TabbedSearchResultView;