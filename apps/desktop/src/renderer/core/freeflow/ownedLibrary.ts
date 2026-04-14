import { BrowserProvider, Contract } from 'ethers';
import { Platform } from '@main/core/enum/Platform';
import { libraryContext, playlistContext } from '@renderer/core/electronContextApi';
import { searchIndexedTrackResources, type IndexedTrackResource } from '@renderer/core/web25/client';
import type { FreeFlowTrackInfo, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { DEFAULT_SEPOLIA_CONTRACTS, MUSIC_ASSET_ABI, PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';

type WalletProviderLike = ConstructorParameters<typeof BrowserProvider>[0];

const OWNED_LIBRARY_UPDATED_EVENT = 'freeflow:owned-library-updated';

function toTrackInfo(item: IndexedTrackResource): FreeFlowTrackInfo {
  return {
    resourceKey: item.resourceKey,
    chainId: item.chainId,
    contractAddress: item.contractAddress,
    tokenId: item.tokenId,
    accessModel: item.accessModel,
    previewSeconds: item.previewSeconds,
    priceEth: item.priceEth,
    royaltyBps: item.royaltyBps,
    coverUrl: item.coverUrl,
    audioUrl: item.audioUrl,
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

function toTrackEntity(item: IndexedTrackResource): TrackEntity {
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
    freeflow: toTrackInfo(item),
  };
}

function trackKey(track: TrackEntity) {
  return `${track.platform}:${track.platform_unique_id}`;
}

async function runInConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  if (!items.length) return results;

  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= items.length) return;
      results[currentIndex] = await worker(items[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function checkOwnedResource(
  resource: IndexedTrackResource,
  account: string,
  provider: BrowserProvider,
) {
  const tokenId = resource.tokenId;
  if (!tokenId) return false;

  const normalizedAccount = account.toLowerCase();
  const hubAddress = resource.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;

  const hasPublicAccess = resource.accessModel !== 'purchase';

  const checks: Array<Promise<boolean>> = [];
  if (hasPublicAccess) {
    checks.push(Promise.resolve(true));
  } else if (hubAddress) {
    const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, provider);
    checks.push(
      platformHub.hasAccess(account, tokenId)
        .then((value: boolean) => Boolean(value))
        .catch(() => false),
    );
  }

  if (resource.contractAddress) {
    const musicAsset = new Contract(resource.contractAddress, MUSIC_ASSET_ABI, provider);
    checks.push(
      musicAsset.ownerOf(tokenId)
        .then((ownerAddress: string) => ownerAddress.toLowerCase() === normalizedAccount)
        .catch(() => false),
    );
  }

  if (!checks.length) return false;
  const values = await Promise.all(checks);
  return values.some(Boolean);
}

async function syncOwnedTracksToLibrary(ownedTracks: TrackEntity[]) {
  const playlists = await playlistContext.getPlaylists();
  const libraryPlaylist = playlists.find((item) => item.playlist_id === 0);
  const currentTracks = (libraryPlaylist?.tracks || []).filter((track) => track.platform === Platform.FREEFLOW);

  const currentByKey = new Map(currentTracks.map((track) => [trackKey(track), track] as const));
  const ownedByKey = new Map(ownedTracks.map((track) => [trackKey(track), track] as const));

  for (const [key, track] of ownedByKey.entries()) {
    if (!currentByKey.has(key)) {
      await libraryContext.addTrackToLibrary(track);
    }
  }

  for (const [key, track] of currentByKey.entries()) {
    if (!ownedByKey.has(key)) {
      await libraryContext.removeTrackFromLibrary(track);
    }
  }
}

export async function syncOwnedFreeFlowLibrary(input: {
  baseUrl: string;
  walletProvider: WalletProviderLike;
  account: string;
  limit?: number;
}) {
  const baseUrl = input.baseUrl.trim();
  if (!baseUrl) {
    throw new Error('Web2.5 backend URL is empty');
  }

  const provider = new BrowserProvider(input.walletProvider);
  const indexed = await searchIndexedTrackResources(baseUrl, '', input.limit ?? 200);

  const ownedFlags = await runInConcurrency(indexed.items, 6, async (item) => {
    try {
      return await checkOwnedResource(item, input.account, provider);
    } catch {
      return false;
    }
  });

  const ownedTracks = indexed.items
    .filter((_item, index) => ownedFlags[index])
    .map((item) => toTrackEntity(item));

  await syncOwnedTracksToLibrary(ownedTracks);

  window.dispatchEvent(new Event(OWNED_LIBRARY_UPDATED_EVENT));

  return {
    ownedTracks,
    indexedCount: indexed.items.length,
  };
}

export function subscribeOwnedLibraryUpdated(listener: () => void) {
  window.addEventListener(OWNED_LIBRARY_UPDATED_EVENT, listener);
  return () => {
    window.removeEventListener(OWNED_LIBRARY_UPDATED_EVENT, listener);
  };
}
