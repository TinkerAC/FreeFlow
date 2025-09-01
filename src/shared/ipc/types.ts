import type { Settings } from '@src/shared/settings/schema';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { Lyric } from '@src/shared/domainModel/lyricLine';
import type { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';
import type { PlayerState } from '@src/shared/domainModel/playerState';
import { OS } from '@src/shared/OS';

/** Config */
export interface ConfigApi {
  // 新接口
  getAll(): Promise<Settings>;

  get(key: string): Promise<any>;

  set(key: string, value: any): Promise<void>;

  setByPath(path: string, value: any): Promise<void>;

  patch(partial: Partial<Settings>): Promise<void>;

  subscribe(cb: (s: Settings) => void): () => void;
}

/** Library */
export interface LibraryApi {
  getLocalLibrary(): Promise<TrackEntity[]>;

  addTrackToLibrary(track: TrackEntity): Promise<void>;

  removeTrackFromLibrary(track: TrackEntity): Promise<void>;

  downFromHifini(track: TrackEntity): void;

  increasePlayCount(track: TrackEntity): void;
}

/** Lyrics */
export interface LyricsApi {
  getLyrics(track: TrackEntity): Promise<Lyric>;
}

/** Player */
export interface PlayerApi {
  getPlayerStateFromMain(): Promise<PlayerState>;

  sendPlayerState(playerState: PlayerState): void;

  onNotification(callback: (message: string) => void): void;

  onRequestPlayerState(callback: () => void): void;

  removeRequestPlayerStateListener(): void;
}

/** Playlist */
export interface PlaylistApi {
  getPlaylists(): Promise<PlaylistEntity[]>;

  addPlaylist(playlist: PlaylistEntity): Promise<void>;

  modifyPlaylist(playlist: { playlist_id: number; description: string; title: string }): Promise<void>;

  removePlaylist(playlistId: number): Promise<void>;

  addTrackToPlaylist(track: TrackEntity, playlistId: number): Promise<void>;

  removeTrackFromPlaylist(playlistId: number, track: TrackEntity): Promise<void>;

  createPlaylist(): Promise<void>;
}

/** Search */
export interface FusionSearchResult {
  track_result?: TrackEntity[];
  playlist_result?: PlaylistEntity[];
}

export interface SearchApi {
  getSearchResults(term: string): Promise<FusionSearchResult>;

  localSearch(term: string): Promise<TrackEntity[]>;

  getPlaylistDetail(platform: string, platform_unique_id: string): Promise<PlaylistEntity>;
}

/** Shortcut */
export interface ShortcutApi {
  onShortcut(callback: (message: string) => void): void;

  removeShortcutListener(): void;
}

/** System */
export interface SystemApi {
  getPlatform(): Promise<OS>;

  revealDataBaseInFileSystem(): void;

  calculateFileCacheDiskUsage(): Promise<number>;

  getAppVersion(): Promise<string>;
}

/** Window control */
export interface WindowControlApi {
  minimize(): void;

  maximize(): void;

  close(): void;
}

/** Mini Player */
export interface MiniPlayerApi {
  toggle(): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  setExpanded(expanded: boolean): Promise<void>;
}

/** 主聚合 */
export interface MainApi {
  configApi: ConfigApi;
  libraryApi: LibraryApi;
  lyricsApi: LyricsApi;
  playerApi: PlayerApi;
  playlistApi: PlaylistApi;
  searchApi: SearchApi;
  shortcutApi: ShortcutApi;
  systemApi: SystemApi;
  windowControlApi: WindowControlApi;
  miniPlayerApi: MiniPlayerApi;
}
