import { env } from '../../config/env.js';
import { buildReleaseResourceKey, type PersistedResourceRecord } from './resource.repository.js';

type JsonRecord = Record<string, unknown>;

const pinataGatewayBase = env.pinataGatewayBaseUrl.replace(/\/$/, '');

function toGatewayUrl(cid: string) {
  return `${pinataGatewayBase}/${cid}`;
}

function ipfsToGateway(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const normalized = uri.trim();
  if (!normalized) return null;
  if (!normalized.startsWith('ipfs://')) return normalized;
  return toGatewayUrl(normalized.replace(/^ipfs:\/\//, ''));
}

function getMetadataRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object') return null;
  return value as JsonRecord;
}

function pickMetadataAudioGateway(metadata: JsonRecord | null): string | null {
  const properties = metadata?.properties;
  if (!properties || typeof properties !== 'object') return null;
  const media = (properties as JsonRecord).media;
  if (!media || typeof media !== 'object') return null;
  const audio = (media as JsonRecord).audio;
  if (!audio || typeof audio !== 'object') return null;
  const gateway = (audio as JsonRecord).gateway;
  if (typeof gateway === 'string' && gateway.trim()) return gateway;
  const uri = (audio as JsonRecord).uri;
  return typeof uri === 'string' ? ipfsToGateway(uri) : null;
}

function pickMetadataImage(metadata: JsonRecord | null): string | null {
  const image = metadata?.image;
  if (typeof image === 'string' && image.trim()) {
    return ipfsToGateway(image);
  }
  return null;
}

function mapStorageObject(record: {
  id: string;
  cid: string;
  size: number;
  mimeType: string;
} | null) {
  if (!record) return null;
  return {
    id: record.id,
    cid: record.cid,
    gatewayUrl: toGatewayUrl(record.cid),
    size: record.size,
    mimeType: record.mimeType,
  };
}

export function mapResourceRecord(release: PersistedResourceRecord) {
  const metadata = getMetadataRecord(release.metadataDocument ?? null);
  const metadataStorage = mapStorageObject(release.metadataStorageObject ?? null);
  const audioStorage = mapStorageObject(release.audioStorageObject ?? null);
  const coverStorage = mapStorageObject(release.coverStorageObject ?? null);
  const resourceKey = buildReleaseResourceKey({
    chainId: release.chainId,
    musicAssetAddress: release.musicAssetAddress,
    tokenId: release.tokenId,
  }) ?? release.id;

  return {
    id: release.id,
    resourceKey,
    type: 'TRACK',
    title: release.title,
    artistName: release.artistName ?? null,
    albumName: release.albumName ?? null,
    chainId: release.chainId ?? null,
    contractAddress: release.musicAssetAddress ?? null,
    tokenId: release.tokenId ?? null,
    contentCid: metadataStorage?.cid ?? null,
    coverUrl: coverStorage?.gatewayUrl ?? pickMetadataImage(metadata),
    audioUrl: audioStorage?.gatewayUrl ?? pickMetadataAudioGateway(metadata),
    audioCid: audioStorage?.cid ?? null,
    coverCid: coverStorage?.cid ?? null,
    metadataUrl: metadataStorage?.gatewayUrl ?? null,
    metadataCid: metadataStorage?.cid ?? null,
    accessModel: release.accessModel ?? null,
    previewSeconds: release.previewSeconds ?? null,
    priceEth: release.priceEth ?? null,
    explorerUrl: release.explorerUrl ?? null,
    platformHubAddress: release.platformHubAddress ?? null,
    publishTxHash: release.publishTxHash ?? null,
    releaseId: release.id,
    status: release.status ?? null,
    metadataDocument: release.metadataDocument ?? null,
    createdAt: release.createdAt.toISOString(),
    updatedAt: release.updatedAt.toISOString(),
  };
}
