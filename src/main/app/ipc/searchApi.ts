import { ipcRenderer } from 'electron';
import { FusionSearchResult, PlaylistModel } from '@src/shared/types';

export const searchApi = {
  getSearchResults: (term: string): Promise<FusionSearchResult> => ipcRenderer.invoke('get-searchContext-results', term),
  getNetEaseCloudMusicPlaylistDetail: (playlist_id: string): Promise<PlaylistModel> =>
    ipcRenderer.invoke('get-netease-cloud-music-playlistContext-detail', playlist_id),
};

export type SearchApi = typeof searchApi;