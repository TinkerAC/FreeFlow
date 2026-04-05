// audio-service.ts
import { parseFile, selectCover } from 'music-metadata';
import { promises as fs } from 'node:fs';
import type { AudioMetadata } from './audio-metadata.js';


export class AudioService {
  public static async readMeta(filePath: string): Promise<AudioMetadata> {
    await fs.access(filePath);
    const raw = await parseFile(filePath);
    const cover = selectCover(raw.common.picture);

    return {
      format: {
        container: raw.format.container,
        codec: raw.format.codec,
        bitrate: raw.format.bitrate,
        sampleRate: raw.format.sampleRate,
        numberOfChannels: raw.format.numberOfChannels,
        duration: raw.format.duration,
      },
      tags: {
        ...raw.common,
        picture: cover ? [cover] : undefined,
      },
      raw,
    };
  }
}
