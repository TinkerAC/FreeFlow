// ------------------------------
// File: src/renderer/components/SearchResultView/tabs/PlaylistsTab.tsx
// ------------------------------
import React from 'react';
import { DefaultCover } from '@components/static';
import { searchContext } from '@renderer/core/electronContextApi';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { MainContentViewStack, View } from '@components/Maincontent/MainContentViewStack';
import MusicLibraryController from '@renderer/core/controller/MusicLibraryController';

interface PlaylistsTabProps {
  playlists: PlaylistEntity[];
  musicLibraryController: MusicLibraryController;
  viewStack: MainContentViewStack;
}

function PlaylistsTab({
                        playlists, musicLibraryController
                        , viewStack,
                      }: PlaylistsTabProps) {
  if (playlists.length === 0) {
    return <div className="text-gray-500">没有找到歌单。</div>;
  }

  return (
    <div className="space-y-2">
      {playlists.map((playlist) => (
        <div
          key={`${playlist.platform}_${playlist.platform_unique_id}`}
          className="flex items-center space-x-4 p-2 border-b hover:bg-item-bg-hover cursor-pointer"
        >
          <img
            src={playlist.playlist_cover || DefaultCover}
            alt={playlist.title}
            className="w-12 h-12 rounded"
            onClick={async () => {
              const playlist_id = playlist.platform_unique_id;
              const playlistEntity:PlaylistEntity = await searchContext.getNetEaseCloudMusicPlaylistDetail(playlist_id);
              console.debug("前端获取到的歌单数据", playlistEntity);
              musicLibraryController.activePlaylist = playlistEntity;
              viewStack.navigate(View.PLAY_LIST);

            }}
          />
          <div className="flex-grow overflow-x-clip whitespace-nowrap no-scrollbar">
            <div>{playlist.title}</div>
            <div className="text-gray-400">{'mocked'} 首歌曲</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PlaylistsTab;
