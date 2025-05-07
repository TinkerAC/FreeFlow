import { ipcRenderer } from 'electron';

import { TrackModel } from '@src/shared/domainModel/TrackModel';

export const libraryApi = {
  // 读取本地音乐库
  getLocalLibrary: (): Promise<TrackModel[]> => ipcRenderer.invoke('get-local-libraryContext'),
  addTrackToLibrary: async (track: TrackModel) => ipcRenderer.invoke('add-track-to-libraryContext', track),
  removeTrackFromLibrary: async (track: TrackModel) => ipcRenderer.invoke('remove-track-from-libraryContext', track),
  downFromHifini: async (track: TrackModel) => ipcRenderer.send('down-from-hifini', track),
};

export type LibraryApi = typeof libraryApi;