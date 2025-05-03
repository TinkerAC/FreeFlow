import { ipcRenderer } from 'electron';
import { TrackModel } from '@src/shared/domainModel/TrackModel';
import { Lyric } from '@src/shared/domainModel/lyricLine';

export const lyricsApi = {
  getLyrics: (track: TrackModel): Promise<Lyric> => ipcRenderer.invoke('get-lyrics', track),
};

export type LyricsApi = typeof lyricsApi;