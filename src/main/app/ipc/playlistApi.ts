import { ipcRenderer } from 'electron';
import { TrackModel } from '@src/shared/domainModel/TrackModel';
import { PlaylistModel } from '@src/shared/domainModel/playlistModel';

export const playlistApi = {
  getPlaylists: async (): Promise<PlaylistModel[]> => ipcRenderer.invoke('get-playlists'),
  addPlaylist: async (playlist: PlaylistModel) => ipcRenderer.invoke('add-playlistContext', playlist),
  modifyPlaylist: async (playlist: {
    playlist_id: number;
    description: string;
    title: string
  }) => ipcRenderer.invoke('modify-playlistContext', playlist),
  removePlaylist: async (playlistId: number) => ipcRenderer.invoke('remove-playlistContext', playlistId),
  addTrackToPlaylist: async (track: TrackModel, playlistId: number) => ipcRenderer.invoke('add-track-to-playlist', track, playlistId),
  removeTrackFromPlaylist: async (playlistId: number, track: TrackModel) => ipcRenderer.invoke('remove-track-from-playlistContext', playlistId, track),
  createPlaylist: async () => {
    try {
      await ipcRenderer.invoke('create-playlists');
      console.log('歌单创建成功');
    } catch (error) {
      console.error('Error in create-playlists:', error);
    }
  },

};


export type PlaylistApi = typeof playlistApi;