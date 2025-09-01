import { contextBridge, ipcRenderer } from 'electron';
import type { MainApi } from '@src/shared/ipc/types';
import type { Settings } from '@src/shared/settings/schema';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import type { PlayerState } from '@src/shared/domainModel/playerState';
import type { Lyric } from '@src/shared/domainModel/lyricLine';
import { OS } from '@src/shared/OS';

const mainApi: MainApi = {
  configApi: {
    getAll: () => ipcRenderer.invoke('config:getAll') as Promise<Settings>,
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', { key, value }),
    setByPath: (path: string, value: any) => ipcRenderer.invoke('config:setByPath', { path, value }),
    patch: (partial: Partial<Settings>) => ipcRenderer.invoke('config:patch', partial),

    subscribe: (cb) => {
      const handler = (_: Electron.IpcRendererEvent, s: Settings) => cb(s);
      ipcRenderer.on('config:changed', handler);
      return () => ipcRenderer.removeListener('config:changed', handler);
    },
  },

  libraryApi: {
    getLocalLibrary: () => ipcRenderer.invoke('get-local-library') as Promise<TrackEntity[]>,
    addTrackToLibrary: (track) => ipcRenderer.invoke('add-track-to-library', track),
    removeTrackFromLibrary: (track) => ipcRenderer.invoke('remove-track-from-library', track),
    downFromHifini: (track) => ipcRenderer.send('down-from-hifini', track),
    increasePlayCount: (track) => ipcRenderer.send('increase-play-count', track),
  },

  lyricsApi: {
    getLyrics: (track) => ipcRenderer.invoke('get-lyrics', track) as Promise<Lyric>,
  },

  playerApi: {
    getPlayerStateFromMain: () => ipcRenderer.invoke('load-player-state') as Promise<PlayerState>,
    sendPlayerState: (playerState) => ipcRenderer.send('reply-player-state', playerState),

    onNotification: (callback) => {
      ipcRenderer.on('notification', (_e, message: string) => callback(message));
    },

    onRequestPlayerState: (callback) => {
      const listener = () => callback();
      ipcRenderer.on('request-player-state', listener);
    },

    removeRequestPlayerStateListener: () => {
      ipcRenderer.removeAllListeners('request-player-state');
    },
  },

  playlistApi: {
    getPlaylists: () => ipcRenderer.invoke('get-playlist') as Promise<PlaylistEntity[]>,
    addPlaylist: (playlist) => ipcRenderer.invoke('add-playlist', playlist),
    modifyPlaylist: (playlist) => ipcRenderer.invoke('modify-playlist', playlist),
    removePlaylist: (playlistId) => ipcRenderer.invoke('remove-playlist', playlistId),
    addTrackToPlaylist: (track, playlistId) => ipcRenderer.invoke('add-track-to-playlist', track, playlistId),
    removeTrackFromPlaylist: (playlistId, track) => ipcRenderer.invoke('remove-track-from-playlist', playlistId, track),
    createPlaylist: () => ipcRenderer.invoke('create-playlist'),
  },

  searchApi: {
    getSearchResults: (term) => ipcRenderer.invoke('get-search-result', term),
    localSearch: (term) => ipcRenderer.invoke('local-search', term),
    getPlaylistDetail: function(platform: string, platform_unique_id: string): Promise<PlaylistEntity> {
      return ipcRenderer.invoke('get-playlist-detail', platform, platform_unique_id);
    },
  },

  shortcutApi: {
    onShortcut: (callback) => {
      ipcRenderer.on('global-shortcut', (_e, message: string) => callback(message));
    },
    removeShortcutListener: () => {
      ipcRenderer.removeAllListeners('global-shortcut');
    },
  },

  systemApi: {
    getPlatform: () => ipcRenderer.invoke('get-system') as Promise<OS>,
    revealDataBaseInFileSystem: () => ipcRenderer.send('reveal-database-in-file-system'),
    calculateFileCacheDiskUsage: () => ipcRenderer.invoke('calculate-file-cache-disk-usage') as Promise<number>,
    getAppVersion: () => ipcRenderer.invoke('get-app-version') as Promise<string>,
  },

  windowControlApi: {
    minimize: () => ipcRenderer.send('window-controls', 'minimize'),
    maximize: () => ipcRenderer.send('window-controls', 'maximize'),
    close: () => ipcRenderer.send('window-controls', 'close'),
  },

  miniPlayerApi: {
    toggle: () => ipcRenderer.invoke('mini-player:toggle'),
    show: () => ipcRenderer.invoke('mini-player:show'),
    hide: () => ipcRenderer.invoke('mini-player:hide'),
    setExpanded: (expanded: boolean) => ipcRenderer.invoke('mini-player:set-expanded', { expanded }),
  },
};

contextBridge.exposeInMainWorld('mainApi', mainApi);
