import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AudioService } from '@main/core/audio/AudioService';
import type {
  EditableTrackMetadata,
  MetadataWriteRequest,
  MetadataWriteResult,
} from '@src/shared/metadata/metadataEditor';

type DataUrlPayload = {
  mime: string;
  data: Buffer;
};

export class MetadataEditorService {
  public static async readMetadata(filePath: string): Promise<EditableTrackMetadata> {
    const metadata = await AudioService.readMeta(filePath);
    const picture = metadata.tags.picture?.[0];
    const coverDataUrl = picture ? this.toDataUrl(picture.format, Buffer.from(picture.data)) : '';
    const lyricsValue = metadata.tags.lyrics;
    const genreValue = metadata.tags.genre;

    return {
      filePath,
      title: metadata.tags.title ?? '',
      artist: metadata.tags.artist ?? '',
      album: metadata.tags.album ?? '',
      genre: Array.isArray(genreValue) ? genreValue.join(', ') : (genreValue ?? ''),
      year: typeof metadata.tags.year === 'number' ? metadata.tags.year : null,
      lyrics: Array.isArray(lyricsValue) ? lyricsValue.join('\n') : (lyricsValue ?? ''),
      coverDataUrl,
      durationSec: typeof metadata.format.duration === 'number' ? Number(metadata.format.duration.toFixed(2)) : null,
      bitrate: typeof metadata.format.bitrate === 'number' ? metadata.format.bitrate : null,
      sampleRate: typeof metadata.format.sampleRate === 'number' ? metadata.format.sampleRate : null,
      channels: typeof metadata.format.numberOfChannels === 'number' ? metadata.format.numberOfChannels : null,
      codec: metadata.format.codec ?? '',
      container: metadata.format.container ?? '',
    };
  }

  public static async writeMetadata(payload: MetadataWriteRequest): Promise<MetadataWriteResult> {
    try {
      const filePath = payload.filePath;
      if (path.extname(filePath).toLowerCase() !== '.mp3') {
        return {
          ok: false,
          filePath,
          message: '目前仅支持 MP3（ID3v2.3）写入。',
        };
      }

      const sourceBuffer = await fs.readFile(filePath);
      const audioWithoutId3v2 = this.stripId3v2(sourceBuffer);
      const audioPayload = this.stripId3v1(audioWithoutId3v2);

      const frames: Buffer[] = [];
      this.pushTextFrame(frames, 'TIT2', payload.title);
      this.pushTextFrame(frames, 'TPE1', payload.artist);
      this.pushTextFrame(frames, 'TALB', payload.album);
      this.pushTextFrame(frames, 'TCON', payload.genre);

      if (typeof payload.year === 'number' && Number.isFinite(payload.year) && payload.year >= 1000 && payload.year <= 9999) {
        this.pushTextFrame(frames, 'TYER', String(Math.trunc(payload.year)));
      }

      if (payload.lyrics.trim()) {
        frames.push(this.createUsltFrame(payload.lyrics.trim()));
      }

      const coverData = this.parseDataUrl(payload.coverDataUrl);
      if (coverData) {
        frames.push(this.createApicFrame(coverData));
      }

      const tagBody = Buffer.concat(frames);
      const outBuffer = tagBody.length > 0
        ? Buffer.concat([this.createId3Header(tagBody.length), tagBody, audioPayload])
        : audioPayload;

      const tempPath = `${filePath}.metadata-editor.tmp`;
      await fs.writeFile(tempPath, outBuffer);
      await fs.rename(tempPath, filePath);

      return {
        ok: true,
        filePath,
        message: '元数据写入成功。',
      };
    } catch (error) {
      return {
        ok: false,
        filePath: payload.filePath,
        message: error instanceof Error ? error.message : '元数据写入失败',
      };
    }
  }

  private static pushTextFrame(frames: Buffer[], frameId: string, value: string): void {
    const normalized = value.trim();
    if (!normalized) return;
    const body = Buffer.concat([
      Buffer.from([0x03]),
      Buffer.from(normalized, 'utf8'),
    ]);
    frames.push(this.createFrame(frameId, body));
  }

  private static createUsltFrame(lyrics: string): Buffer {
    const body = Buffer.concat([
      Buffer.from([0x03]),
      Buffer.from('eng', 'ascii'),
      Buffer.from([0x00]),
      Buffer.from(lyrics, 'utf8'),
    ]);
    return this.createFrame('USLT', body);
  }

  private static createApicFrame(dataUrlPayload: DataUrlPayload): Buffer {
    const body = Buffer.concat([
      Buffer.from([0x03]),
      Buffer.from(dataUrlPayload.mime, 'ascii'),
      Buffer.from([0x00]),
      Buffer.from([0x03]),
      Buffer.from([0x00]),
      dataUrlPayload.data,
    ]);
    return this.createFrame('APIC', body);
  }

  private static createFrame(frameId: string, body: Buffer): Buffer {
    const header = Buffer.alloc(10);
    header.write(frameId, 0, 4, 'ascii');
    header.writeUInt32BE(body.length, 4);
    header.writeUInt16BE(0, 8);
    return Buffer.concat([header, body]);
  }

  private static createId3Header(bodySize: number): Buffer {
    if (bodySize < 0 || bodySize > 0x0fffffff) {
      throw new Error('ID3 标签大小超出支持范围');
    }

    const header = Buffer.alloc(10);
    header.write('ID3', 0, 3, 'ascii');
    header[3] = 0x03;
    header[4] = 0x00;
    header[5] = 0x00;

    const size = this.toSynchsafe(bodySize);
    size.copy(header, 6);
    return header;
  }

  private static stripId3v2(buffer: Buffer): Buffer {
    if (buffer.length < 10) return buffer;
    if (buffer.toString('ascii', 0, 3) !== 'ID3') return buffer;

    const tagSize = this.fromSynchsafe(buffer.subarray(6, 10));
    const total = 10 + tagSize;
    if (total <= 10 || total > buffer.length) return buffer;
    return buffer.subarray(total);
  }

  private static stripId3v1(buffer: Buffer): Buffer {
    if (buffer.length < 128) return buffer;
    const start = buffer.length - 128;
    if (buffer.toString('ascii', start, start + 3) === 'TAG') {
      return buffer.subarray(0, start);
    }
    return buffer;
  }

  private static toSynchsafe(size: number): Buffer {
    return Buffer.from([
      (size >> 21) & 0x7f,
      (size >> 14) & 0x7f,
      (size >> 7) & 0x7f,
      size & 0x7f,
    ]);
  }

  private static fromSynchsafe(bytes: Uint8Array): number {
    if (bytes.length !== 4) return 0;
    return ((bytes[0] & 0x7f) << 21)
      | ((bytes[1] & 0x7f) << 14)
      | ((bytes[2] & 0x7f) << 7)
      | (bytes[3] & 0x7f);
  }

  private static toDataUrl(mime: string, data: Buffer): string {
    return `data:${mime};base64,${data.toString('base64')}`;
  }

  private static parseDataUrl(dataUrl: string): DataUrlPayload | null {
    const trimmed = dataUrl.trim();
    if (!trimmed) return null;

    const match = /^data:([^;]+);base64,(.+)$/i.exec(trimmed);
    if (!match) {
      throw new Error('封面数据格式无效，必须是 base64 Data URL');
    }

    return {
      mime: match[1],
      data: Buffer.from(match[2], 'base64'),
    };
  }
}
