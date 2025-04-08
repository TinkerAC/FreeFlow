// src/renderer/components/SearchResultView/SearchResultView.tsx
import React from 'react';
import useStateRef from 'react-usestateref';
import ContextMenu from '@components/SearchResultView/ContextMenu';
import { FusionSearchResult, HifiniTrackModel, PlaylistModel, TrackModel } from '@src/shared/types';
import { DefaultCover, Hifini,QQMusic, NetEaseCloudMusic } from '@components/static';
import { libraryContext, playlistContext, searchContext } from '@main/app/electronContextApi';

interface NetSearchResultViewProps {
  addToNext: (track: TrackModel) => void;
  addToNextAndPlay: (track: TrackModel) => void;
  refreshPlaylists: () => void;
  fusionSearchResult: FusionSearchResult;
  onSelectOnlinePlaylist: (playlistModel: PlaylistModel) => void;
  setMainContentView: (view: string) => void;
  savedPlaylists: PlaylistModel[];
}

// 定义 NetSearchResultView 组件
function NetSearchResultView({
                               addToNext,
                               addToNextAndPlay,
                               refreshPlaylists,
                               fusionSearchResult,
                               onSelectOnlinePlaylist, //used to jump to playlistContext view (online)
                               setMainContentView,
                               savedPlaylists,
                             }: NetSearchResultViewProps) {
  const [contextMenu, setContextMenu] = useStateRef<{ x: number; y: number } | null>(null);
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackModel | null>(null);

  // 解构赋值
  const { tracks, playlists } = fusionSearchResult;
  const popularResult: TrackModel = tracks[0] || HifiniTrackModel.empty();


  // 右键点击事件处理
  const handleContextMenu = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    track: TrackModel,
  ) => {
    event.preventDefault();
    setSelectedTrack(track);
    setContextMenu({
      x: event.clientX, // 使用 clientX 和 clientY
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
      {/* 判断是否有结果 */}
      {popularResult && Object.keys(popularResult).length === 0 && tracks.length === 0 ? (
        <div className="text-center text-gray-500 text-xl">
          没有搜索结果，请尝试其他关键词。
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-8">
          {/* 热门结果 */}
          <div>
            <div className="text-2xl mb-4 font-bold">热门结果</div>
            {Object.keys(popularResult).length > 0 ? (
              <div
                className="flex mb-6 items-center"
                onContextMenu={(e) => handleContextMenu(e, popularResult)} // 右键点击触发
              >
                <img
                  src={popularResult.cover_src}
                  alt={popularResult.title}
                  className="w-24 h-24 rounded-lg mr-4"
                />
                <div>
                  <div className="text-3xl mb-2">{popularResult?.title}</div>
                  <div className="text-lg text-gray-400">
                    歌曲 · {popularResult?.artist}
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
                    className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover"
                    key={index}
                    onDoubleClick={() => {
                      console.log('添加到下一首并播放');
                      addToNextAndPlay(track);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, track)} // 右键点击触发
                  >
                    <img
                      src={track.cover_src}
                      alt={track.title}
                      className="w-12 h-12 rounded"
                    />
                    <div className="flex-grow">
                      <div>{track.title}</div>
                      <div className="text-gray-400">{track.artist}</div>
                    </div>
                    <div className="text-sm text-gray-500">{track.duration}</div>
                    {/* 新增显示歌曲来源平台,根据平台渲染icon */}
                    <div>
                      {track.platform === 'NetEaseCloudMusic' && (
                        <img
                          src={NetEaseCloudMusic}
                          alt={track.platform}
                          width={20}
                          height={20}
                        />
                      )}
                      {track.platform === 'Hifini' && (
                        <img
                          src={Hifini}
                          alt={track.platform}
                          width={20}
                          height={20}
                        />
                      )}
                      {track.platform === 'QQMusic' && (
                        <img
                          src={QQMusic}
                          alt={track.platform}
                          width={20}
                          height={20}
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
      )}

      {/* 歌单列表：新增的 Section */}
      <div className="mt-8">
        <div className="text-2xl mb-4 font-bold">歌单</div>
        {playlists.length > 0 ? (
          <div className="space-y-4">
            {playlists.map((playlist, index) => (
              <div
                className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover"
                key={index}
                // 如果需要右键操作歌单，也可以添加 onContextMenu
              >
                {/* 假设 PlaylistModel 中有 cover、name、trackCount 等字段 */}
                <img
                  src={playlist.cover_src || DefaultCover}
                  alt={playlist.title}
                  className="w-12 h-12 rounded"
                  onClick={
                    async () => {
                      const playlist_id = playlist.platform_unique_id;
                      const playlistModel = await searchContext.getNetEaseCloudMusicPlaylistDetail(playlist_id);
                      onSelectOnlinePlaylist(await playlistModel);
                      setMainContentView('playlist');
                    }} />
                <div className="flex-grow">
                  <div>{playlist.title}</div>
                  <div className="text-gray-400">{1} 首歌曲</div>
                </div>
                {/* 此处可根据需求添加更多信息或操作按钮 */}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500">没有找到歌单。</div>
        )}
      </div>

      {/* 渲染右键菜单 */}
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
        <div
          className="fixed inset-0 z-999"
          onClick={handleCloseMenu}
        />
      )}
    </div>
  );
}

export default NetSearchResultView;