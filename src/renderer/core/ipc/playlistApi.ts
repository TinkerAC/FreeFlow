import { ipcRenderer } from 'electron';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

export const playlistApi = {
  getPlaylists: async (): Promise<PlaylistEntity[]> => ipcRenderer.invoke('get-playlist'),
  addPlaylist: async (playlist: PlaylistEntity) => ipcRenderer.invoke('add-playlistContext', playlist),
  modifyPlaylist: async (playlist: {
    playlist_id: number;
    description: string;
    title: string
  }) => ipcRenderer.invoke('modify-playlistContext', playlist),
  removePlaylist: async (playlistId: number) => ipcRenderer.invoke('remove-playlistContext', playlistId),
  addTrackToPlaylist: async (track: TrackEntity, playlistId: number) => ipcRenderer.invoke('add-track-to-playlist', track, playlistId),
  removeTrackFromPlaylist: async (playlistId: number, track: TrackEntity) => ipcRenderer.invoke('remove-track-from-playlistContext', playlistId, track),
  createPlaylist: async () => {
    try {
      await ipcRenderer.invoke('create-playlist');
      console.log('歌单创建成功');
    } catch (error) {
      console.error('Error in create-playlist:', error);
    }
  },

};


export type PlaylistApi = typeof playlistApi;