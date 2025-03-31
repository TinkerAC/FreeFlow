import { ConfigApi } from '@main/app/ipc/configApi';
import { LibraryApi } from '@main/app/ipc/libraryApi';
import { LyricsApi } from '@main/app/ipc/lyricsApi';
import { PlatformApi } from '@main/app/ipc/platformApi';
import { PlayerApi } from '@main/app/ipc/playerApi';
import { PlaylistApi } from '@main/app/ipc/playlistApi';
import { SearchApi } from '@main/app/ipc/searchApi';
import { ShortcutApi } from '@main/app/ipc/shortcutApi';
import { WindowControlApi } from '@main/app/ipc/windowControlApi';

const configContext: ConfigApi = window.mainApi.configApi;
const playerContext: PlayerApi = window.mainApi.playerApi;
const playlistContext: PlaylistApi = window.mainApi.playlistApi;
const searchContext: SearchApi = window.mainApi.searchApi;
const shortcutContext: ShortcutApi = window.mainApi.shortcutApi;
const windowControlContext: WindowControlApi = window.mainApi.windowControlApi;
const libraryContext: LibraryApi = window.mainApi.libraryApi;
const lyricsContext: LyricsApi = window.mainApi.lyricsApi;
const platformContext: PlatformApi = window.mainApi.platformApi;

export {
  configContext,
  playerContext,
  playlistContext,
  searchContext,
  shortcutContext,
  windowControlContext,
  libraryContext,
  lyricsContext,
  platformContext,
};
