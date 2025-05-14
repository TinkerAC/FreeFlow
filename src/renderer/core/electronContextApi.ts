import { ConfigApi } from '@renderer/core/ipc/configApi';
import { LibraryApi } from '@renderer/core/ipc/libraryApi';
import { LyricsApi } from '@renderer/core/ipc/lyricsApi';
import { SystemApi } from '@renderer/core/ipc/systemApi';
import { PlayerApi } from '@renderer/core/ipc/playerApi';
import { PlaylistApi } from '@renderer/core/ipc/playlistApi';
import { SearchApi } from '@renderer/core/ipc/searchApi';
import { ShortcutApi } from '@renderer/core/ipc/shortcutApi';
import { WindowControlApi } from '@renderer/core/ipc/windowControlApi';

const configContext: ConfigApi = window.mainApi.configApi;
const playerContext: PlayerApi = window.mainApi.playerApi;
const playlistContext: PlaylistApi = window.mainApi.playlistApi;
const searchContext: SearchApi = window.mainApi.searchApi;
const shortcutContext: ShortcutApi = window.mainApi.shortcutApi;
const windowControlContext: WindowControlApi = window.mainApi.windowControlApi;
const libraryContext: LibraryApi = window.mainApi.libraryApi;
const lyricsContext: LyricsApi = window.mainApi.lyricsApi;
const systemContext: SystemApi = window.mainApi.systemApi;

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
};
