import { ipcRenderer } from 'electron';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { Lyric } from '@src/shared/domainModel/lyricLine';

export const lyricsApi = {
  getLyrics: (track: TrackEntity): Promise<Lyric> => ipcRenderer.invoke('get-lyrics', track),
};

export type LyricsApi = typeof lyricsApi;