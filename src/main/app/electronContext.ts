import { ipcRenderer } from 'electron';
import { TrackModel } from '@src/shared/types';

const electronContext = {
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  minimize: () => ipcRenderer.send('window-controls', 'minimize'),
  maximize: () => ipcRenderer.send('window-controls', 'maximize'),
  close: () => ipcRenderer.send('window-controls', 'close'),

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
    ipcRenderer.on('request-player-state', (event) => {
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
  sendPlayerState: (state: any) => {
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
  modifyPlaylist: (
    playlistId: number,
    playlist_title: string,
    playlist_description: string,
    refreshPlaylists: () => void,
  ) => {
    ipcRenderer
      .invoke('modify-playlist', playlistId, playlist_title, playlist_description)
      .then(() => {
        console.log('歌单修改成功');
        refreshPlaylists();
      });
  },

  // 从歌单中删除音乐
  removeTrackFromPlaylist: (
    playlistId: number,
    trackId: number,
    refreshPlaylists: () => void,
  ) => {
    ipcRenderer.invoke('remove-track-from-playlist', playlistId, trackId).then(() => {
      console.log(`从歌单${playlistId}中删除音乐${trackId}成功`);
      refreshPlaylists();
    });
  },

  // 删除歌单
  removePlaylist: (playlistId: number, refreshPlaylists: () => void) => {
    ipcRenderer.invoke('remove-playlist', playlistId).then(() => {
      console.log('歌单删除成功');
      refreshPlaylists();
    });
  },

  getConfig: (key: string) => ipcRenderer.invoke('get-config', key),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),

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

  getSearchResults: (term: string) => ipcRenderer.invoke('get-search-results', term),
  getMusicLink: (dataHref: string) => ipcRenderer.invoke('get-music-link', dataHref),
};


export type ElectronContextApi = typeof electronContext;

export default electronContext;