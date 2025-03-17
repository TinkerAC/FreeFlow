import { ipcRenderer } from 'electron';
import { PlayerState, PlaylistModel, TrackModel } from '@src/shared/types';

const electronContext = {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  minimize: () => ipcRenderer.send('window-controls', 'minimize'),
  maximize: () => ipcRenderer.send('window-controls', 'maximize'),
  close: () => ipcRenderer.send('window-controls', 'close'),


  getLyrics: (track: TrackModel) => ipcRenderer.invoke('get-lyrics', track),

  createPlaylist: async () => {
    try {
      await ipcRenderer.invoke('create-playlists');
      console.log('歌单创建成功');
    } catch (error) {
      console.error('Error in create-playlists:', error);
    }
  },

  // 读取本地音乐库(全部音乐信息)
  getLocalLibrary: () => {
    return ipcRenderer.invoke('get-local-library');
  },
  // 读取歌单
  getPlaylists: async () => {
    return await ipcRenderer.invoke('get-playlists');
  },

  // 监听主进程请求播放器状态事件
  onRequestPlayerState: (callback: () => void) => {
    const listener = () => {
      callback();
    };
    ipcRenderer.on('request-player-state', () => {
      console.log('主进程请求播放器状态事件已触发');
      listener();
    });
    console.log('主进程请求播放器状态事件监听已添加');

    // 返回移除监听器的函数
    return () => {
      ipcRenderer.removeListener('request-player-state', listener);
      console.log('主进程请求播放器状态事件监听已移除');
    };
  },

  // 渲染进程收到主进程请求播放器状态事件后，向主进程发送播放器状态
  sendPlayerState: (state: PlayerState) => {
    ipcRenderer.send('reply-player-state', state);
    console.log('播放器状态已发送');
  },

  // 向库中添加音乐
  addTrackToLibrary: async (track: TrackModel) => {
    await ipcRenderer.invoke('add-track-to-library', track);
  },

  // 向歌单中添加音乐
  addTrackToPlaylist: async (track: TrackModel, playlistId: number) => {
    await ipcRenderer.invoke('add-track-to-playlist', track, playlistId);
  },

  // 修改歌单信息
  modifyPlaylist: async (
    playlist: { playlist_id: number; description: string; title: string },
  ) => {
    await ipcRenderer.invoke('modify-playlist', playlist);
  },

  // 从歌单中删除音乐
  removeTrackFromPlaylist: async (
    playlistId: number,
    track: TrackModel,
  ) => {
    await ipcRenderer.invoke('remove-track-from-playlist', playlistId, track);
  },


  //从库中删除音乐
  removeTrackFromLibrary: async (track: TrackModel) => {
    await ipcRenderer.invoke('remove-track-from-library', track);
  },

  // 删除歌单
  removePlaylist: async (playlistId: number) => {
    await ipcRenderer.invoke('remove-playlist', playlistId);
  },

  addPlayList: async (playlist: PlaylistModel) => {
    await ipcRenderer.invoke('add-playlist', playlist);
  },

  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: string) => ipcRenderer.invoke('set-config', key, value),

  getPlayerState: () => ipcRenderer.invoke('player-state'),

  // 监听 'global-shortcut' 事件
  onShortcut: (callback: (message: string) => void) =>
    ipcRenderer.on('global-shortcut', (event, message) => {
      callback(message);
    }),
  // 移除 'global-shortcut' 事件监听
  removeShortcutListener: () => {
    ipcRenderer.removeAllListeners('global-shortcut');
    console.log('全局快捷键事件监听已移除');
  },

  // 接收主进程提醒

  onNotification: (callback: (message: string) => void) =>
    ipcRenderer.on('notification', (event, message) => {
      callback(message);
    }),

  getSearchResults: (term: string) => ipcRenderer.invoke('get-search-results', term),
  getNetEaseCloudMusicPlaylistDetail: (playlist_id: string) =>
    ipcRenderer.invoke('get-netease-cloud-music-playlist-detail', playlist_id),
};


export type ElectronContextApi = typeof electronContext;

export default electronContext;