import { ipcRenderer } from 'electron';

import { TrackEntity } from '@src/shared/domainModel/TrackEntity';

export const libraryApi = {
  // 读取本地音乐库
  getLocalLibrary: (): Promise<TrackEntity[]> => ipcRenderer.invoke('get-local-library'),
  addTrackToLibrary: async (track: TrackEntity) => ipcRenderer.invoke('add-track-to-library', track),
  removeTrackFromLibrary: async (track: TrackEntity) => ipcRenderer.invoke('remove-track-from-library', track),
  downFromHifini: async (track: TrackEntity) => ipcRenderer.send('down-from-hifini', track),
  increasePlayCount: async (track: TrackEntity) => ipcRenderer.send('increase-play-count', track),
};

export type LibraryApi = typeof libraryApi;