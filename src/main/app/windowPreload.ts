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

contextBridge.exposeInMainWorld('windowControlApi', windowControlApi);

contextBridge.exposeInMainWorld('configApi', configApi);

contextBridge.exposeInMainWorld('libraryApi', libraryApi);

contextBridge.exposeInMainWorld('platformApi', platformApi);

contextBridge.exposeInMainWorld('playerApi', playerApi);

contextBridge.exposeInMainWorld('playlistApi', playlistApi);

contextBridge.exposeInMainWorld('searchApi', searchApi);

contextBridge.exposeInMainWorld('shortcutApi', shortcutApi);

contextBridge.exposeInMainWorld('lyricsApi', lyricsApi);




