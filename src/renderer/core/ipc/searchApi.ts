import { ipcRenderer } from 'electron';
import { FusionSearchResult } from '@src/shared/domainModel/FusionSearchResult';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export const searchApi = {
  getSearchResults: (term: string): Promise<FusionSearchResult> => ipcRenderer.invoke('get-search-result', term),
  localSearch: (term: string): Promise<TrackEntity[]> => ipcRenderer.invoke('local-search', term),
  getNetEaseCloudMusicPlaylistDetail: (playlist_id: string): Promise<PlaylistEntity> =>
      ipcRenderer.invoke('get-netease-cloud-music-playlist-detail', playlist_id),
};

export type SearchApi = typeof searchApi;