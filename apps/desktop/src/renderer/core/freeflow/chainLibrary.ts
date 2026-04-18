import { Platform } from '@main/core/enum/Platform';
import { chainLibraryContext } from '@renderer/core/electronContextApi';
import type { IndexedTrackResource } from '@renderer/core/web25/client';
import type { FreeFlowTrackInfo, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { PlaylistEntity } from '@src/shared/domainModel/playlistEntity';

export const CHAIN_LIBRARY_PLAYLIST_ID = -100;
export const CHAIN_LIBRARY_PLATFORM_UNIQUE_ID = 'freeflow-chain-library';
export const CHAIN_LIBRARY_TITLE = '链上音乐库';
export const CHAIN_LIBRARY_DESC = '管理已购买或已拥有的链上音乐资源';
export const CHAIN_LIBRARY_UPDATED_EVENT = 'freeflow:chain-library-updated';

export function isChainLibraryPlaylist(playlist?: PlaylistEntity | null) {
  return playlist?.platform === Platform.FREEFLOW
    && playlist.platform_unique_id === CHAIN_LIBRARY_PLATFORM_UNIQUE_ID;
}

export function buildChainLibraryPlaylist(tracks: TrackEntity[]): PlaylistEntity {
  return {
    playlist_id: CHAIN_LIBRARY_PLAYLIST_ID,
    platform: Platform.FREEFLOW,
    platform_unique_id: CHAIN_LIBRARY_PLATFORM_UNIQUE_ID,
    title: CHAIN_LIBRARY_TITLE,
    created_at: new Date(),
    tracks,
    creator: 'FreeFlow',
    description: CHAIN_LIBRARY_DESC,
    modified_at: new Date(),
    playlist_cover: tracks[0]?.cover_src || '',
  };
}

export function toFreeFlowTrackInfo(item: IndexedTrackResource): FreeFlowTrackInfo {
  return {
    resourceKey: item.resourceKey,
    chainId: item.chainId,
    contractAddress: item.contractAddress,
    tokenId: item.tokenId,
    accessModel: item.accessModel,
    previewSeconds: item.previewSeconds,
    priceEth: item.priceEth,
    coverUrl: item.coverUrl,
    coverCid: item.coverCid,
    audioUrl: item.audioUrl,
    audioCid: item.audioCid,
    metadataUrl: item.metadataUrl,
    metadataCid: item.metadataCid,
    explorerUrl: item.explorerUrl,
    platformHubAddress: item.platformHubAddress,
    publishTxHash: item.publishTxHash,
    releaseId: item.releaseId,
    status: item.status,
    metadataDocument: item.metadataDocument,
  };
}

export function toChainTrackEntity(item: IndexedTrackResource): TrackEntity {
  return {
    platform: Platform.FREEFLOW,
    platform_unique_id: item.resourceKey,
    title: item.title || (item.tokenId ? `Token #${item.tokenId}` : 'Untitled Track'),
    artist: item.artistName || 'Unknown Artist',
    album: item.albumName || 'FreeFlow',
    duration: item.previewSeconds ?? 0,
    cover_src: item.coverUrl || '',
    created_at: new Date(item.createdAt),
    modified_at: new Date(item.updatedAt),
    freeflow: toFreeFlowTrackInfo(item),
  };
}

export function mergeTrackWithFreeFlowInfo(track: TrackEntity, info: FreeFlowTrackInfo): TrackEntity {
  return {
    ...track,
    platform: Platform.FREEFLOW,
    platform_unique_id: info.resourceKey || track.platform_unique_id,
    title: track.title || (info.tokenId ? `Token #${info.tokenId}` : 'Untitled Track'),
    artist: track.artist || 'Unknown Artist',
    album: track.album || 'FreeFlow',
    duration: track.duration ?? info.previewSeconds ?? 0,
    cover_src: track.cover_src || info.coverUrl || '',
    freeflow: info,
  };
}

export async function getChainLibraryTracks() {
  return await chainLibraryContext.getTracks();
}

export async function upsertChainLibraryTrack(track: TrackEntity) {
  const saved = await chainLibraryContext.upsertTrack(track);
  window.dispatchEvent(new Event(CHAIN_LIBRARY_UPDATED_EVENT));
  return saved;
}

export async function removeChainLibraryTrack(track: TrackEntity) {
  const removed = await chainLibraryContext.removeTrack(track);
  window.dispatchEvent(new Event(CHAIN_LIBRARY_UPDATED_EVENT));
  return removed;
}

export function notifyChainLibraryUpdated() {
  window.dispatchEvent(new Event(CHAIN_LIBRARY_UPDATED_EVENT));
}

export function subscribeChainLibraryUpdated(listener: () => void) {
  window.addEventListener(CHAIN_LIBRARY_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(CHAIN_LIBRARY_UPDATED_EVENT, listener);
  };
}
