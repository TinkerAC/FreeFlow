export interface EditableTrackMetadata {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  lyrics: string;
  coverDataUrl: string;
  durationSec: number | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  codec: string;
  container: string;
}

export interface MetadataWriteRequest {
  filePath: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  lyrics: string;
  coverDataUrl: string;
}

export interface MetadataWriteResult {
  ok: boolean;
  filePath: string;
  message: string;
}
