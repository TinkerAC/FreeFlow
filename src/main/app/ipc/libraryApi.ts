import { ipcRenderer } from 'electron';

import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export const libraryApi = {
  // 读取本地音乐库
  getLocalLibrary: (): Promise<TrackEntity[]> => ipcRenderer.invoke('get-local-libraryContext'),
  addTrackToLibrary: async (track: TrackEntity) => ipcRenderer.invoke('add-track-to-libraryContext', track),
  removeTrackFromLibrary: async (track: TrackEntity) => ipcRenderer.invoke('remove-track-from-libraryContext', track),
  downFromHifini: async (track: TrackEntity) => ipcRenderer.send('down-from-hifini', track),
};

export type LibraryApi = typeof libraryApi;