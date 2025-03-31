import { contextBridge } from 'electron';
import { windowControlApi } from '@main/app/ipc/windowControlApi';
import { configApi } from '@main/app/ipc/configApi';
import { platformApi } from '@main/app/ipc/platformApi';
import { playerApi } from '@main/app/ipc/playerApi';

import { playlistApi } from '@main/app/ipc/playlistApi';

import { searchApi } from '@main/app/ipc/searchApi';

import { shortcutApi } from '@main/app/ipc/shortcutApi';
import { libraryApi } from '@main/app/ipc/libraryApi';
import { lyricsApi } from '@main/app/ipc/lyricsApi';


const mainApi = {
  windowControlApi,
  configApi,
  platformApi,
  playerApi,
  playlistApi,
  searchApi,
  shortcutApi,
  libraryApi,
  lyricsApi,
};


contextBridge.exposeInMainWorld('mainApi', mainApi);






