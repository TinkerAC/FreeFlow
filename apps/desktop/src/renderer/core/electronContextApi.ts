import type {
  ConfigApi,
  LibraryApi,
  LyricsApi,
  MainApi,
  PlayerApi,
  PlaylistApi,
  ProfileApi,
  SearchApi,
  ShortcutApi,
  SystemApi,
  WindowControlApi,
} from '@src/shared/ipc/types';

const mainApi = window.mainApi as MainApi;

const configContext: ConfigApi = mainApi.configApi;
const playerContext: PlayerApi = mainApi.playerApi;
const playlistContext: PlaylistApi = mainApi.playlistApi;
const searchContext: SearchApi = mainApi.searchApi;
const shortcutContext: ShortcutApi = mainApi.shortcutApi;
const windowControlContext: WindowControlApi = mainApi.windowControlApi;
const libraryContext: LibraryApi = mainApi.libraryApi;
const lyricsContext: LyricsApi = mainApi.lyricsApi;
const systemContext: SystemApi = mainApi.systemApi;
const profileContext: ProfileApi = mainApi.profileApi;

export {
  configContext,
  playerContext,
  playlistContext,
  searchContext,
  shortcutContext,
  windowControlContext,
  libraryContext,
  lyricsContext,
  systemContext,
  profileContext,
};
