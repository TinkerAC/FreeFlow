import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import axios from 'axios';
import { inject, injectable } from 'inversify';
import { DISymbol } from '@main/di/symbol';
import { DataPath } from '@main/core/PathConfig';

export type IpfsDownloadInput = {
  cid: string;
  gatewayBaseUrl: string;
  fileName: string;
};

export type IpfsDownloadResult = {
  cid: string;
  gatewayUrl: string;
  fileName: string;
  relativePath: string;
  absolutePath: string;
  bytesWritten: number;
};

function sanitizeFileName(raw: string) {
  const normalized = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_');
  return normalized || `freeflow-${Date.now()}.bin`;
}

@injectable()
export class IpfsDownloadService {
  constructor(
    @inject(DISymbol.DataPath) private readonly dataPath: DataPath,
  ) {
    fs.mkdirSync(this.dataPath.musicDir, { recursive: true });
  }

  async download(input: IpfsDownloadInput): Promise<IpfsDownloadResult> {
    const cid = input.cid.trim();
    if (!cid) throw new Error('IPFS CID is required');

    const gatewayBaseUrl = input.gatewayBaseUrl.trim().replace(/\/$/, '');
    if (!gatewayBaseUrl) throw new Error('Pinata gateway is required');

    const fileName = sanitizeFileName(input.fileName);
    const absolutePath = path.join(this.dataPath.musicDir, fileName);
    const gatewayUrl = `${gatewayBaseUrl}/${cid}`;

    const response = await axios.get(gatewayUrl, {
      responseType: 'stream',
      timeout: 60_000,
    });

    await pipeline(response.data, fs.createWriteStream(absolutePath));
    const stat = fs.statSync(absolutePath);

    return {
      cid,
      gatewayUrl,
      fileName,
      relativePath: fileName,
      absolutePath,
      bytesWritten: stat.size,
    };
  }
}
