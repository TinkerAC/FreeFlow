// ------------------------------
// File: src/renderer/components/SearchResultView/TabbedSearchResultView.tsx
// ------------------------------
import React, { useState } from 'react';
import useStateRef from 'react-usestateref';
import Player from '@renderer/core/player/Player';
import TabNav, { TabKey } from './TabNav';

import ContextMenu from '@components/Maincontent/SearchResultView/ContextMenu';
import { libraryContext, playlistContext } from '@main/app/electronContextApi';
import PlaylistsTab from '@components/Maincontent/SearchResultView/PlaylistTab';
import TracksTab from '@components/Maincontent/SearchResultView/TrackTab';
import PopularTab from '@components/Maincontent/SearchResultView/PopularTab';
import { TrackModel } from '@src/shared/domainModel/TrackModel';
import { FusionSearchResult } from '@src/shared/domainModel/fusionSearchResult';
import { PlaylistModel } from '@src/shared/domainModel/playlistModel';

export interface TabbedSearchResultViewProps {
  /** 外部可选：初始激活的 Tab */
  initialTab?: TabKey;
  /** 刷新本地歌单 */
  refreshPlaylists: () => void;
  /** 综合搜索结果 */
  fusionSearchResult: FusionSearchResult | null;
  /** 点击在线歌单回调 */
  onSelectOnlinePlaylist: (playlistModel: PlaylistModel) => void;
  /** 切换主内容区域视图 */
  setMainContentView: (view: string) => void;
  /** 已保存的本地歌单 */
  savedPlaylists: PlaylistModel[];
  /** 播放器实例 */
  player: Player;
}

/**
 * 将原先的瀑布流式布局改造为 Tab 分栏布局。
 * 支持外部设置初始 Tab，也支持通过 `onTabChange` 获取当前选中的 tab。
 */
function TabbedSearchResultView({
                                  initialTab = 'popular',
                                  refreshPlaylists,
                                  fusionSearchResult,
                                  onSelectOnlinePlaylist,
                                  setMainContentView,
                                  savedPlaylists,
                                  player,
                                }: TabbedSearchResultViewProps) {
  // ----------------------
  // tab state
  // ----------------------
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // ----------------------
  // context‑menu state
  // ----------------------
  const [contextMenu, setContextMenu] = useStateRef<{ x: number; y: number } | null>(null);
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackModel | null>(null);

  //---------------------------------------
  // 还未搜索
  //---------------------------------------
  if (!fusionSearchResult) {
    return (
      <div className="text-center text-gray-500 text-xl p-4">请输入关键词进行搜索...</div>
    );
  }

  const { tracks, playlists } = fusionSearchResult;
  const popularResult = tracks[0] as TrackModel | undefined;

  //---------------------------------------
  // 无搜索结果
  //---------------------------------------
  if (tracks.length === 0 && playlists.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xl p-4">没有搜索结果，请尝试其他关键词。</div>
    );
  }

  //---------------------------------------
  // 右键菜单逻辑
  //---------------------------------------
  const openContextMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    track: TrackModel,
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
            tracks={tracks}
            player={player}
            onContextMenu={openContextMenu}
          />
        )}

        {activeTab === 'playlists' && (
          <PlaylistsTab
            playlists={playlists}
            onSelectOnlinePlaylist={onSelectOnlinePlaylist}
            setMainContentView={setMainContentView}
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
          addToLibrary={(track) => libraryContext.addTrackToLibrary(track).then(refreshPlaylists)}
          addTrackToPlaylist={(track, playlist_id) =>
            playlistContext.addTrackToPlaylist(track, playlist_id).then(refreshPlaylists)
          }
          playlists={savedPlaylists}
          handleCloseMenu={closeContextMenu}
        />
      )}

      {/* 点击空白处关闭菜单 */}
      {contextMenu && <div className="fixed inset-0 z-50" onClick={closeContextMenu} />}
    </div>
  );
}

export default TabbedSearchResultView;


