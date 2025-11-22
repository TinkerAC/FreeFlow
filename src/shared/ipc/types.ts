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

/** Track */
export interface TrackApi {
  getInfo(platform: string, platform_unique_id: string): Promise<TrackEntity>;

  updateBasic(payload: {
    platform: string;
    platform_unique_id: string;
    title?: string;
    artist?: string;
    album?: string
  }): Promise<TrackEntity>;

  cleanBasic(payload: { title: string; artist?: string; album?: string }): Promise<{
    title: string;
    artist: string;
    album?: string
  }>;
}

/** Player */
export interface PlayerApi {
  getPlayerStateFromMain(): Promise<PlayerState>;

  sendPlayerState(playerState: PlayerState,terminate:boolean): void;

  onNotification(callback: (message: string) => void): void;

  onRequestPlayerState(callback: () => void): void;

  removeRequestPlayerStateListener(): void;

  // Single-owner extensions
  control(cmd: 'play' | 'pause' | 'toggle' | 'next' | 'prev' | 'seek' | 'setVolume', payload?: any): void;

  onStateUpdate(cb: (state: PlayerState) => void): () => void;

  requestLiveState(): void;

  broadcastState(state: PlayerState): void;

  onLiveStateRequest(cb: () => void): () => void;

  onDumpRequest?(cb: () => void): () => void;

  onControl(cb: (cmd: string, payload: any) => void): () => void;
}

/** Playlist */
export interface PlaylistApi {
  getPlaylists(): Promise<PlaylistEntity[]>;

  addPlaylist(playlist: PlaylistEntity): Promise<void>;

  modifyPlaylist(playlist: {
    playlist_id: number;
    description: string;
    title: string;
    playlist_cover?: string
  }): Promise<void>;

  removePlaylist(playlistId: number): Promise<void>;

  addTrackToPlaylist(track: TrackEntity, playlistId: number): Promise<void>;

  removeTrackFromPlaylist(playlistId: number, track: TrackEntity): Promise<void>;

  createPlaylist(): Promise<void>;

  updatePlaylistPositions(updates: Array<{ playlist_id: number; position: number }>): Promise<void>;

  updateTrackPositions(playlistId: number, updates: Array<{ track_id: number; position: number }>): Promise<void>;
}

/** Search */
export interface FusionSearchResult {
  track_result?: TrackEntity[];
  playlist_result?: PlaylistEntity[];
}

export interface SearchApi {
  getSearchResults(term: string, safeMode?: boolean): Promise<FusionSearchResult>;

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

export interface YouTubeMusicApi {
  openLoginWindow(): Promise<void>;

  syncCredentials(): Promise<{ cookie: string; visitorData?: string }>;

  closeLoginWindow(): Promise<void>;
}

/** 主聚合 */
export interface MainApi {
  configApi: ConfigApi;
  libraryApi: LibraryApi;
  lyricsApi: LyricsApi;
  trackApi: TrackApi;
  playerApi: PlayerApi;
  playlistApi: PlaylistApi;
  searchApi: SearchApi;
  shortcutApi: ShortcutApi;
  systemApi: SystemApi;
  windowControlApi: WindowControlApi;
  miniPlayerApi: MiniPlayerApi;
  youtubeMusicApi: YouTubeMusicApi;
}
