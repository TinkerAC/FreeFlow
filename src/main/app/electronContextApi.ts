import { ConfigApi } from '@main/app/ipc/configApi';
import { LibraryApi } from '@main/app/ipc/libraryApi';
import { LyricsApi } from '@main/app/ipc/lyricsApi';
import { PlatformApi } from '@main/app/ipc/platformApi';
import { PlayerApi } from '@main/app/ipc/playerApi';
import { PlaylistApi } from '@main/app/ipc/playlistApi';
import { SearchApi } from '@main/app/ipc/searchApi';
import { ShortcutApi } from '@main/app/ipc/shortcutApi';
import { WindowControlApi } from '@main/app/ipc/windowControlApi';

const configContext: ConfigApi = window.configApi;
const playerContext: PlayerApi = window.playerApi;
const playlistContext: PlaylistApi = window.playlistApi;
const searchContext: SearchApi = window.searchApi;
const shortcutContext: ShortcutApi = window.shortcutApi;
const windowControlContext: WindowControlApi = window.windowControlApi;
const libraryContext: LibraryApi = window.libraryApi;
const lyricsContext: LyricsApi = window.lyricsApi;
const platformContext: PlatformApi = window.platformApi;

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
