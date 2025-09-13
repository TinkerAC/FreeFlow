import { contextBridge, ipcRenderer } from 'electron';
import type { MainApi } from '@src/shared/ipc/types';
import type { Settings } from '@src/shared/settings/schema';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import type { PlayerState } from '@src/shared/domainModel/playerState';
import type { Lyric } from '@src/shared/domainModel/lyricLine';
import { OS } from '@src/shared/OS';
import { Channels } from '@src/shared/ipc/channels';

const mainApi: MainApi = {
  configApi: {
    getAll: () => ipcRenderer.invoke(Channels.Config.GetAll) as Promise<Settings>,
    get: (key: string) => ipcRenderer.invoke(Channels.Config.Get, key),
    set: (key: string, value: any) => ipcRenderer.invoke(Channels.Config.Set, { key, value }),
    setByPath: (path: string, value: any) => ipcRenderer.invoke(Channels.Config.SetByPath, { path, value }),
    patch: (partial: Partial<Settings>) => ipcRenderer.invoke(Channels.Config.Patch, partial),

    subscribe: (cb) => {
      const handler = (_: Electron.IpcRendererEvent, s: Settings) => cb(s);
      ipcRenderer.on(Channels.Config.Changed, handler);
      return () => ipcRenderer.removeListener(Channels.Config.Changed, handler);
    },
  },

  libraryApi: {
    getLocalLibrary: () => ipcRenderer.invoke(Channels.Library.GetLocalLibrary) as Promise<TrackEntity[]>,
    addTrackToLibrary: (track) => ipcRenderer.invoke(Channels.Library.AddTrackToLibrary, track),
    removeTrackFromLibrary: (track) => ipcRenderer.invoke(Channels.Library.RemoveTrackFromLibrary, track),
    downFromHifini: (track) => ipcRenderer.send(Channels.Library.DownloadFromHifini, track),
    increasePlayCount: (track) => ipcRenderer.send(Channels.Library.IncreasePlayCount, track),
  },

  lyricsApi: {
    getLyrics: (track) => ipcRenderer.invoke(Channels.Lyrics.Get, track) as Promise<Lyric>,
  },

  trackApi: {
    getInfo: (platform: string, platform_unique_id: string) => ipcRenderer.invoke(Channels.Track.GetInfo, platform, platform_unique_id) as Promise<TrackEntity>,
    updateBasic: (payload: { platform: string; platform_unique_id: string; title?: string; artist?: string; album?: string }) =>
      ipcRenderer.invoke(Channels.Track.UpdateBasic, payload) as Promise<TrackEntity>,
    cleanBasic: (payload: { title: string; artist?: string; album?: string }) =>
      ipcRenderer.invoke(Channels.Track.CleanBasic, payload) as Promise<{ title: string; artist: string; album?: string }>,
  },

  playerApi: {
    getPlayerStateFromMain: () => ipcRenderer.invoke(Channels.Player.LoadState) as Promise<PlayerState>,
    sendPlayerState: (playerState) => ipcRenderer.send(Channels.Player.ReplyState, playerState),

    onNotification: (callback) => {
      ipcRenderer.on(Channels.Player.Notification, (_e, message: string) => callback(message));
    },

    onRequestPlayerState: (callback) => {
      const listener = () => callback();
      ipcRenderer.on(Channels.Player.RequestState, listener);
    },

    removeRequestPlayerStateListener: () => {
      ipcRenderer.removeAllListeners(Channels.Player.RequestState);
    },

    // Single-owner extensions
    control: (cmd: any, payload?: any) => ipcRenderer.send(Channels.Player.Control, cmd, payload),
    onStateUpdate: (cb: (s: PlayerState) => void) => {
      const handler = (_: Electron.IpcRendererEvent, s: PlayerState) => cb(s);
      ipcRenderer.on(Channels.Player.State, handler);
      return () => ipcRenderer.removeListener(Channels.Player.State, handler);
    },
    requestLiveState: () => ipcRenderer.send(Channels.Player.RequestState),
    broadcastState: (state: PlayerState) => ipcRenderer.send(Channels.Player.State, state),
    onLiveStateRequest: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on(Channels.Player.RequestState, handler);
      return () => ipcRenderer.removeListener(Channels.Player.RequestState, handler);
    },
    // 专用于应用退出：请求一次用于保存到磁盘的 dump
    onDumpRequest: (cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on(Channels.Player.RequestDump, handler);
      return () => ipcRenderer.removeListener(Channels.Player.RequestDump, handler);
    },
    onControl: (cb: (cmd: string, payload: any) => void) => {
      const handler = (_: Electron.IpcRendererEvent, cmd: string, payload: any) => cb(cmd, payload);
      ipcRenderer.on(Channels.Player.Control, handler);
      return () => ipcRenderer.removeListener(Channels.Player.Control, handler);
    },
  },

  playlistApi: {
    getPlaylists: () => ipcRenderer.invoke(Channels.Playlist.GetAll) as Promise<PlaylistEntity[]>,
    addPlaylist: (playlist) => ipcRenderer.invoke(Channels.Playlist.Add, playlist),
    modifyPlaylist: (playlist) => ipcRenderer.invoke(Channels.Playlist.Modify, playlist),
    removePlaylist: (playlistId) => ipcRenderer.invoke(Channels.Playlist.Remove, playlistId),
    addTrackToPlaylist: (track, playlistId) => ipcRenderer.invoke(Channels.Playlist.AddTrack, track, playlistId),
    removeTrackFromPlaylist: (playlistId, track) => ipcRenderer.invoke(Channels.Playlist.RemoveTrack, playlistId, track),
    createPlaylist: () => ipcRenderer.invoke(Channels.Playlist.Create),
  },

  searchApi: {
    getSearchResults: (term) => ipcRenderer.invoke(Channels.Search.GetResults, term),
    localSearch: (term) => ipcRenderer.invoke(Channels.Search.LocalSearch, term),
    getPlaylistDetail: function(platform: string, platform_unique_id: string): Promise<PlaylistEntity> {
      return ipcRenderer.invoke(Channels.Search.GetPlaylistDetail, platform, platform_unique_id);
    },
  },

  shortcutApi: {
    onShortcut: (callback) => {
      ipcRenderer.on(Channels.Shortcut.Global, (_e, message: string) => callback(message));
    },
    removeShortcutListener: () => {
      ipcRenderer.removeAllListeners(Channels.Shortcut.Global);
    },
  },

  systemApi: {
    getPlatform: () => ipcRenderer.invoke(Channels.System.GetPlatform) as Promise<OS>,
    revealDataBaseInFileSystem: () => ipcRenderer.send(Channels.System.RevealDB),
    calculateFileCacheDiskUsage: () => ipcRenderer.invoke(Channels.System.CalcFileCacheDiskUsage) as Promise<number>,
    getAppVersion: () => ipcRenderer.invoke(Channels.System.GetAppVersion) as Promise<string>,
  },

  windowControlApi: {
    minimize: () => ipcRenderer.send(Channels.Window.Controls, 'minimize'),
    maximize: () => ipcRenderer.send(Channels.Window.Controls, 'maximize'),
    close: () => ipcRenderer.send(Channels.Window.Controls, 'close'),
  },

  miniPlayerApi: {
    toggle: () => ipcRenderer.invoke(Channels.MiniPlayer.Toggle),
    show: () => ipcRenderer.invoke(Channels.MiniPlayer.Show),
    hide: () => ipcRenderer.invoke(Channels.MiniPlayer.Hide),
    setExpanded: (expanded: boolean) => ipcRenderer.invoke(Channels.MiniPlayer.SetExpanded, { expanded }),
  },
};

contextBridge.exposeInMainWorld('mainApi', mainApi);
