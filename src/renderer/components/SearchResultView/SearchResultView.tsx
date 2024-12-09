// src/renderer/components/SearchResultView/SearchResultView.tsx
import React from 'react';
import useStateRef from 'react-usestateref';
import ContextMenu from '@components/SearchResultView/ContextMenu';
import context from '@main/app/electronContextApi';
import { PlaylistModel, TrackModel } from '@src/shared/types';
import icons from '@components/Icons';

interface NetSearchResultViewProps {
  popularResult: TrackModel;
  tracks: TrackModel[];
  addToNext: (track: TrackModel) => void;
  addToNextAndPlay: (track: TrackModel) => void;
  refreshPlaylists: () => void;
  playlists: PlaylistModel[];
}

// 定义 NetSearchResultView 组件
function NetSearchResultView({
                               popularResult,
                               tracks = [],
                               addToNext,
                               addToNextAndPlay,
                               refreshPlaylists,
                               playlists = [],      // 新增传入的播放列表
                             }: NetSearchResultViewProps) {
  const [contextMenu, setContextMenu] = useStateRef<{ x: number, y: number } | null>(null); // 保存右键菜单的位置
  const [, setSelectedTrack, selectedTrackRef] = useStateRef<TrackModel | null>(null); // 保存右键点击的曲目

  // 右键点击事件处理
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement, MouseEvent>, track: TrackModel) => {
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
      {Object.keys(popularResult).length === 0 && tracks.length === 0 ? (
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
                onContextMenu={(e) => handleContextMenu(e, popularResult)}  // 右键点击触发
              >
                <img
                  src={popularResult.cover_src}
                  alt={popularResult.title}
                  className="w-24 h-24 rounded-lg mr-4"
                />
                <div>
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
                    className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover"
                    key={index}
                    onDoubleClick={() => {
                      console.log('添加到下一首并播放');
                      addToNextAndPlay(track);
                    }}
                    onContextMenu={(e) => handleContextMenu(e, track)}  // 右键点击触发
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
                    {/*新增显示歌曲来源平台,根据平台渲染icon*/}
                    <div>
                      {track.platform === 'NetEaseCloudMusic' && (
                        <img src={icons.NetEaseCloudMusic} alt={track.platform} width={20} height={20} />)}

                      {track.platform === 'Hifini' && (
                        <img src={icons.Hifini} alt={track.platform} width={20} height={20} />)}
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

      {/* 渲染右键菜单 */}
      {contextMenu && selectedTrackRef.current && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          track={selectedTrackRef.current}
          addToNext={addToNext}
          addToLibrary={(track) => context.addTrackToLibrary(track).then(refreshPlaylists)}
          addTrackToPlaylist={(track, playlist_id) => context.addTrackToPlaylist(track, playlist_id).then(refreshPlaylists)}
          playlists={playlists}                  // 传入播放列表
          handleCloseMenu={handleCloseMenu}
        />
      )}

      {/* 点击页面其他部分时关闭右键菜单 */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-999" // 确保覆盖全屏
          onClick={handleCloseMenu}
        />
      )}
    </div>
  );
}

export default NetSearchResultView;
