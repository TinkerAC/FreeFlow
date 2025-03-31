import { ipcRenderer } from 'electron';
import { Lyric, TrackModel } from '@src/shared/types';

export const lyricsApi = {
  getLyrics: (track: TrackModel): Promise<Lyric> => ipcRenderer.invoke('get-lyricsContext', track),
};

export type LyricsApi = typeof lyricsApi;