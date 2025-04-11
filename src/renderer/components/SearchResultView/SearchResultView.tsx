// src/renderer/components/SearchResultView/SearchResultView.tsx
import React from 'react';
import useStateRef from 'react-usestateref';
import ContextMenu from '@components/SearchResultView/ContextMenu';
import { FusionSearchResult, HifiniTrackModel, PlaylistModel, TrackModel } from '@src/shared/types';
import { DefaultCover, Hifini, QQMusic, NetEaseCloudMusic } from '@components/static';
import { libraryContext, playlistContext, searchContext } from '@main/app/electronContextApi';

interface NetSearchResultViewProps {
  addToNext: (track: TrackModel) => void;
  addToNextAndPlay: (track: TrackModel) => void;
  refreshPlaylists: () => void;
  fusionSearchResult: FusionSearchResult | null; // 允许为空，表示未进行搜索或搜索中
  onSelectOnlinePlaylist: (playlistModel: PlaylistModel) => void;
  setMainContentView: (view: string) => void;
  savedPlaylists: PlaylistModel[];
}

function NetSearchResultView({
                               addToNext,
                               addToNextAndPlay,
                               refreshPlaylists,
                               fusionSearchResult,
                               onSelectOnlinePlaylist,
                               setMainContentView,
                               savedPlaylists,
                             }: NetSearchResultViewProps) {
  const [contextMenu, setContextMenu] = useStateRef<{ x: number; y: number } | null>(null);
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackModel | null>(null);

  // 未进行搜索时提示
  if (!fusionSearchResult) {
    return (
      <div className="text-center text-gray-500 text-xl p-4">
        请输入关键词进行搜索...
      </div>
    );
  }

  const { tracks, playlists } = fusionSearchResult;

  // 当搜索后，结果为空时的提示语
  if (tracks.length === 0 && playlists.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xl p-4">
        没有搜索结果，请尝试其他关键词。
      </div>
    );
  }

  // 热门结果取第一条（如果存在）
  const popularResult: TrackModel = tracks[0] || HifiniTrackModel.empty();

  // 右键菜单事件
  const handleContextMenu = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    track: TrackModel,
  ) => {
    event.preventDefault();
    setSelectedTrack(track);
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
    });
  };

  // 关闭右键菜单
  const handleCloseMenu = () => {
    setContextMenu(null);
    setSelectedTrack(null);
  };

  return (
    <div className="relative p-4">
      <div className="grid grid-cols-2 gap-8">
        {/* 热门结果 */}
        <div>
          <div className="text-2xl mb-4 font-bold">热门结果</div>
          {Object.keys(popularResult).length > 0 ? (
            <div
              className="flex mb-6 items-center cursor-pointer hover:bg-item-bg-hover p-2 rounded"
              onContextMenu={(e) => handleContextMenu(e, popularResult)}
              onDoubleClick={() => {
                console.log('添加到下一首并播放');
                addToNextAndPlay(popularResult);
              }}
            >
              <img
                src={popularResult.cover_src}
                alt={popularResult.title}
                className="w-24 h-24 rounded-lg mr-4"
              />
              <div className="flex flex-col justify-center whitespace-nowrap overflow-x-auto">
                <div className="text-3xl mb-2">{popularResult.title}</div>
                <div className="text-lg text-gray-400">
                  歌曲 · {popularResult.artist}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">没有找到热门结果。</div>
          )}
        </div>

        {/* 歌曲列表 */}
        <div>
          <div className="text-2xl mb-4 font-bold">歌曲</div>
          {tracks.length > 0 ? (
            <div className="space-y-4">
              {tracks.map((track, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover cursor-pointer"
                  onDoubleClick={() => {
                    console.log('添加到下一首并播放');
                    addToNextAndPlay(track);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                >
                  <img
                    src={track.cover_src}
                    alt={track.title}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-grow whitespace-nowrap overflow-x-auto no-scrollbar">
                    <div>{track.title}</div>
                    <div className="text-gray-400">{track.artist}</div>
                  </div>
                  <div className="text-sm text-gray-500">{track.duration.toFixed(1)}</div>
                  {/* 平台 Icon 固定宽高，通过 inline-style 或 Tailwind 辅助类实现 */}
                  <div className="flex-shrink-0">
                    {track.platform === 'NetEaseCloudMusic' && (
                      <img
                        src={NetEaseCloudMusic}
                        alt={track.platform}
                        style={{
                          width: '20px',
                          height: '20px',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                    {track.platform === 'Hifini' && (
                      <img
                        src={Hifini}
                        alt={track.platform}
                        style={{
                          width: '20px',
                          height: '20px',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                    {track.platform === 'QQMusic' && (
                      <img
                        src={QQMusic}
                        alt={track.platform}
                        style={{
                          width: '20px',
                          height: '20px',
                          objectFit: 'contain',
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">没有找到歌曲。</div>
          )}
        </div>
      </div>

      {/* 歌单列表 */}
      <div className="mt-8">
        <div className="text-2xl mb-4 font-bold">歌单</div>
        {playlists.length > 0 ? (
          <div className="space-y-4">
            {playlists.map((playlist, index) => (
              <div
                key={index}
                className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover cursor-pointer no-scrollbar"
              >
                <img
                  src={playlist.cover_src || DefaultCover}
                  alt={playlist.title}
                  className="w-12 h-12 rounded"
                  onClick={async () => {
                    const playlist_id = playlist.platform_unique_id;
                    const playlistModel = await searchContext.getNetEaseCloudMusicPlaylistDetail(playlist_id);
                    onSelectOnlinePlaylist(playlistModel);
                    setMainContentView('playlist');
                  }}
                />
                <div className="flex-grow whitespace-nowrap overflow-x-clip no-scrollbar">
                  <div>{playlist.title}</div>
                  <div className="text-gray-400">{"mocked"} 首歌曲</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">没有找到歌单。</div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && selectedTrackRef.current && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={selectedTrackRef.current}
          addToNext={addToNext}
          addToLibrary={(track) => libraryContext.addTrackToLibrary(track).then(refreshPlaylists)}
          addTrackToPlaylist={(track, playlist_id) =>
            playlistContext.addTrackToPlaylist(track, playlist_id).then(refreshPlaylists)
          }
          playlists={savedPlaylists}
          handleCloseMenu={handleCloseMenu}
        />
      )}

      {/* 点击页面其他部分时关闭右键菜单 */}
      {contextMenu && (
        <div className="fixed inset-0 z-50" onClick={handleCloseMenu} />
      )}
    </div>
  );
}

export default NetSearchResultView;