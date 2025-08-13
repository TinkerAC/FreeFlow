// global.d.ts


import { ConfigApi } from '@renderer/core/ipc/configApi';
import { LibraryApi } from '@renderer/core/ipc/libraryApi';
import { LyricsApi } from '@renderer/core/ipc/lyricsApi';
import { SystemApi } from '@renderer/core/ipc/systemApi';
import { PlayerApi } from '@renderer/core/ipc/playerApi';
import { PlaylistApi } from '@renderer/core/ipc/playlistApi';
import { SearchApi } from '@renderer/core/ipc/searchApi';
import { ShortcutApi } from '@renderer/core/ipc/shortcutApi';
import { WindowControlApi } from '@renderer/core/ipc/windowControlApi';

interface MainApi {
  configApi: ConfigApi;
  libraryApi: LibraryApi;
  lyricsApi: LyricsApi;
  systemApi: SystemApi;
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

// 为 MUI 主题添加自定义状态类型
declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
    };
  }

  // allow configuration using `createTheme()`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}


