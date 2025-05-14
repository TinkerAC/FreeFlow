import { contextBridge } from 'electron';
import { windowControlApi } from '@renderer/core/ipc/windowControlApi';
import { configApi } from '@renderer/core/ipc/configApi';
import { systemApi } from '@renderer/core/ipc/systemApi';
import { playerApi } from '@renderer/core/ipc/playerApi';

import { playlistApi } from '@renderer/core/ipc/playlistApi';

import { searchApi } from '@renderer/core/ipc/searchApi';

import { shortcutApi } from '@renderer/core/ipc/shortcutApi';
import { libraryApi } from '@renderer/core/ipc/libraryApi';
import { lyricsApi } from '@renderer/core/ipc/lyricsApi';


const mainApi = {
  windowControlApi,
  configApi,
  systemApi,
  playerApi,
  playlistApi,
  searchApi,
  shortcutApi,
  libraryApi,
  lyricsApi,
};


contextBridge.exposeInMainWorld('mainApi', mainApi);






