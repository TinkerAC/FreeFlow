import { ipcMain } from 'electron';
import path from 'node:path';
import { Channels } from '@src/shared/ipc/channels';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { IpcContext } from './ipcContext';

function sanitizeFileName(raw: string) {
  return raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '_') || `freeflow-${Date.now()}`;
}

function extractCidFromIpfsUri(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.startsWith('ipfs://')) {
    return trimmed.replace(/^ipfs:\/\//, '').split('/')[0] ?? '';
  }
  return '';
}

function extractCidFromGatewayUrl(value?: string | null) {
  if (!value) return '';
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    const ipfsIndex = parts.findIndex((part) => part === 'ipfs');
    if (ipfsIndex >= 0) return parts[ipfsIndex + 1] ?? '';
    return parts.at(-1) ?? '';
  } catch {
    return '';
  }
}

function extractGatewayBaseUrl(audioUrl?: string | null) {
  if (!audioUrl) return '';
  try {
    const url = new URL(audioUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const ipfsIndex = parts.findIndex((part) => part === 'ipfs');
    const baseParts = ipfsIndex >= 0 ? parts.slice(0, ipfsIndex + 1) : parts.slice(0, -1);
    url.pathname = `/${baseParts.join('/')}`;
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function getMetadataAudioUri(track: TrackEntity) {
  const doc = track.freeflow?.metadataDocument;
  if (!doc || typeof doc !== 'object') return '';
  const properties = (doc as Record<string, unknown>).properties;
  if (!properties || typeof properties !== 'object') return '';
  const media = (properties as Record<string, unknown>).media;
  if (!media || typeof media !== 'object') return '';
  const audio = (media as Record<string, unknown>).audio;
  if (!audio || typeof audio !== 'object') return '';
  const uri = (audio as Record<string, unknown>).uri;
  return typeof uri === 'string' ? uri : '';
}

function getAudioExtension(track: TrackEntity) {
  const audioUrl = track.freeflow?.audioUrl;
  if (audioUrl) {
    try {
      const ext = path.extname(new URL(audioUrl).pathname);
      if (ext) return ext;
    } catch {
      // ignore invalid URL and fall through
    }
  }
  return '.mp3';
}

function resolveDownloadInput(track: TrackEntity, fallbackGateway: string) {
  const audioUrl = track.freeflow?.audioUrl ?? '';
  const metadataAudioUri = getMetadataAudioUri(track);
  const cid = track.freeflow?.audioCid
    || extractCidFromIpfsUri(metadataAudioUri)
    || extractCidFromGatewayUrl(audioUrl);
  const gatewayBaseUrl = fallbackGateway.trim()
    || extractGatewayBaseUrl(audioUrl);

  if (!cid || !gatewayBaseUrl) {
    throw new Error('该资源缺少可下载的 IPFS CID 或 Pinata gateway');
  }

  const baseName = sanitizeFileName(`${track.artist || 'Unknown Artist'} - ${track.title || cid}`);
  return {
    cid,
    gatewayBaseUrl,
    fileName: `${baseName}${getAudioExtension(track)}`,
  };
}

export function registerDownloadHandlers({
                                           fileCacheManager,
                                           ipfsDownloadService,
                                           configService,
                                           trackService,
                                         }: IpcContext): void {
  ipcMain.handle(Channels.System.CalcFileCacheDiskUsage, async () => {
    return await fileCacheManager.getDiskUsage();
  });

  ipcMain.handle(Channels.Library.DownloadTrack, async (_evt, track: TrackEntity) => {
    if (!track.id) {
      throw new Error('下载前需要先把资源加入链上音乐库或本地曲库');
    }

    const fallbackGateway = String(configService.get('services.pinata.gateway') ?? '').replace(/\/$/, '');
    const input = resolveDownloadInput(track, fallbackGateway);

    await trackService.markDownloadState(track.id, {
      status: 'downloading',
      sourceCid: input.cid,
      sourceGateway: input.gatewayBaseUrl,
      error: '',
    });

    try {
      const result = await ipfsDownloadService.download(input);
      return await trackService.markDownloadState(track.id, {
        status: 'downloaded',
        localPath: result.relativePath,
        sourceCid: result.cid,
        sourceGateway: result.gatewayUrl,
        error: '',
        downloadedAt: new Date(),
      });
    } catch (error) {
      await trackService.markDownloadState(track.id, {
        status: 'failed',
        sourceCid: input.cid,
        sourceGateway: input.gatewayBaseUrl,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  });
}
