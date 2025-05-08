import { ipcRenderer } from 'electron';
import { FusionSearchResult } from '@src/shared/domainModel/fusionSearchResult';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

export const searchApi = {
  getSearchResults: (term: string): Promise<FusionSearchResult> => ipcRenderer.invoke('get-search-result', term),
  getNetEaseCloudMusicPlaylistDetail: (playlist_id: string): Promise<PlaylistEntity> =>
    ipcRenderer.invoke('get-netease-cloud-music-playlistContext-detail', playlist_id),
};

export type SearchApi = typeof searchApi;