import { ipcRenderer } from 'electron';
import { TrackModel } from '@src/shared/types';

export const lyricsApi = {
  getLyrics: (track: TrackModel): Promise<any> => ipcRenderer.invoke('get-lyricsContext', track),
};

export type LyricsApi = typeof lyricsApi;