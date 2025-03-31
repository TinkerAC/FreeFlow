// global.d.ts


import { ConfigApi } from '@main/app/ipc/configApi';
import { LibraryApi } from '@main/app/ipc/libraryApi';
import { LyricsApi } from '@main/app/ipc/lyricsApi';
import { PlatformApi } from '@main/app/ipc/platformApi';
import { PlayerApi } from '@main/app/ipc/playerApi';
import { PlaylistApi } from '@main/app/ipc/playlistApi';
import { SearchApi } from '@main/app/ipc/searchApi';
import { ShortcutApi } from '@main/app/ipc/shortcutApi';
import { WindowControlApi } from '@main/app/ipc/windowControlApi';

interface MainApi {
  configApi: ConfigApi;
  libraryApi: LibraryApi;
  lyricsApi: LyricsApi;
  platformApi: PlatformApi;
  playerApi: PlayerApi;
  playlistApi: PlaylistApi;
  searchApi: SearchApi;
  shortcutApi: ShortcutApi;
  windowControlApi: WindowControlApi;
}

declare global {
  interface Window {
    mainApi: MainApi;
  }
}


