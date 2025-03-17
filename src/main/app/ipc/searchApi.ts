import { ipcRenderer } from 'electron';

export const searchApi = {
  getSearchResults: (term: string): Promise<any> => ipcRenderer.invoke('get-searchContext-results', term),
  getNetEaseCloudMusicPlaylistDetail: (playlist_id: string): Promise<any> =>
    ipcRenderer.invoke('get-netease-cloud-music-playlistContext-detail', playlist_id),
};

export type SearchApi = typeof searchApi;