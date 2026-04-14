import { createAsyncThunk } from '@reduxjs/toolkit';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import {
  createCreatorRelease,
  type CreatorReleaseDashboard,
  type CreatorReleaseRecord,
  getPinataConfig,
  listCreatorReleases,
  updateCreatorRelease,
  uploadFileToWeb25Pinata,
  type Web25Session,
} from '@renderer/core/web25/client';
import {
  loginWeb25WithSiwe,
  logoutWeb25Session,
  refreshWeb25Session,
} from '@renderer/core/web25/auth';
import { PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';
import { type AccessCheckState, defaultSplits, EMPTY_DASHBOARD, metadataUriForRelease, slugify } from '../workshopHelpers';
import type { MusicWorkshopRootState } from './workshopStore';

type WalletProviderLike = ConstructorParameters<typeof BrowserProvider>[0];

export type EffectiveWeb3Settings = {
  chainId: number;
  chainName: string;
  explorerUrl: string;
  musicAssetAddress: string;
  royaltySplitterFactoryAddress: string;
  platformHubAddress: string;
  defaultRoyaltyBps: number;
  platformFeeBps: number;
};

function normalizeSplits(release: CreatorReleaseRecord, fallbackAddress: string) {
  const source = release.royaltySplits.length ? release.royaltySplits : defaultSplits(fallbackAddress);
  const normalized = source
    .map((item) => ({ ...item, address: item.address.trim(), share: Number(item.share || 0) }))
    .filter((item) => item.address && item.share > 0);
  return normalized.length ? normalized : defaultSplits(fallbackAddress);
}

export const refreshWeb25StateThunk = createAsyncThunk<
  { session: Web25Session | null; pinataConfig: Awaited<ReturnType<typeof getPinataConfig>> | null },
  { baseUrl: string }
>(
  'musicWorkshop/refreshWeb25State',
  async ({ baseUrl }) => {
    if (!baseUrl) {
      return { session: null, pinataConfig: null };
    }

    try {
      const [sessionPayload, pinataPayload] = await Promise.all([
        refreshWeb25Session(baseUrl),
        getPinataConfig(baseUrl),
      ]);
      return { session: sessionPayload, pinataConfig: pinataPayload };
    } catch {
      return { session: null, pinataConfig: null };
    }
  },
);

export const refreshDashboardThunk = createAsyncThunk<
  { dashboard: CreatorReleaseDashboard; selectedRelease: CreatorReleaseRecord | null },
  { baseUrl: string; preferredReleaseId?: string | null },
  { state: MusicWorkshopRootState }
>(
  'musicWorkshop/refreshDashboard',
  async ({ baseUrl, preferredReleaseId }, { getState }) => {
    const state = getState().workshop;
    if (!state.web25Session || !baseUrl) {
      return { dashboard: EMPTY_DASHBOARD, selectedRelease: null };
    }

    const payload = await listCreatorReleases(baseUrl);
    const next = payload.releases.find((item) => item.id === preferredReleaseId)
      ?? payload.releases.find((item) => item.id === state.selectedRelease?.id)
      ?? payload.releases[0]
      ?? null;

    return { dashboard: payload, selectedRelease: next };
  },
);

export const createReleaseThunk = createAsyncThunk<
  CreatorReleaseRecord,
  { baseUrl: string; address?: string | null }
>(
  'musicWorkshop/createRelease',
  async ({ baseUrl, address }) => {
    const created = await createCreatorRelease(baseUrl, {
      artistName: address || undefined,
      accessModel: 'purchase',
    });

    return {
      ...created,
      royaltySplits: created.royaltySplits.length ? created.royaltySplits : defaultSplits(address || undefined),
    };
  },
);

export const siweLoginThunk = createAsyncThunk<
  { session: Web25Session },
  { baseUrl: string; walletProvider: WalletProviderLike; fallbackAddress?: string | null }
>(
  'musicWorkshop/siweLogin',
  async ({ baseUrl, walletProvider, fallbackAddress }) => {
    const session = await loginWeb25WithSiwe({
      baseUrl,
      walletProvider,
      fallbackAddress,
    });
    return { session };
  },
);

export const siweLogoutThunk = createAsyncThunk<
  void,
  { baseUrl: string }
>(
  'musicWorkshop/siweLogout',
  async ({ baseUrl }) => {
    await logoutWeb25Session(baseUrl);
  },
);

export const autosaveReleaseThunk = createAsyncThunk<
  CreatorReleaseRecord,
  { baseUrl: string; releaseId: string; payload: Record<string, unknown> }
>(
  'musicWorkshop/autosaveRelease',
  async ({ baseUrl, releaseId, payload }) => updateCreatorRelease(baseUrl, releaseId, payload),
);

export const uploadAssetsThunk = createAsyncThunk<
  CreatorReleaseRecord,
  { baseUrl: string; release: CreatorReleaseRecord; audioFile: File | null; coverFile: File | null }
>(
  'musicWorkshop/uploadAssets',
  async ({ baseUrl, release, audioFile, coverFile }) => {
    if (!audioFile && !release.audioStorageObjectId) {
      throw new Error('No audio file');
    }

    try {
      await updateCreatorRelease(baseUrl, release.id, {
        status: 'ASSETS_PENDING',
        currentStage: 'storage',
        latestError: null,
        activityEntry: { message: 'Started asset upload', level: 'info' },
      });

      let coverStorageObjectId = release.coverStorageObjectId;
      if (coverFile) {
        const result = await uploadFileToWeb25Pinata(baseUrl, {
          file: coverFile,
          name: `${slugify(release.title || coverFile.name)}-cover`,
          keyvalues: {
            kind: 'cover',
            releaseId: release.id,
            artist: release.artistName || 'unknown',
          },
        });
        coverStorageObjectId = result.storageObjectId;
      }

      let audioStorageObjectId = release.audioStorageObjectId;
      if (audioFile) {
        const result = await uploadFileToWeb25Pinata(baseUrl, {
          file: audioFile,
          name: `${slugify(release.title || audioFile.name)}-audio`,
          keyvalues: {
            kind: 'audio',
            releaseId: release.id,
            artist: release.artistName || 'unknown',
          },
        });
        audioStorageObjectId = result.storageObjectId;
      }

      return await updateCreatorRelease(baseUrl, release.id, {
        status: 'ASSETS_UPLOADED',
        currentStage: 'storage',
        audioStorageObjectId,
        coverStorageObjectId,
        audioSourceName: audioFile?.name || release.audioSourceName,
        audioSourcePath: (audioFile as (File & { path?: string }) | null)?.path || release.audioSourcePath,
        coverSourceName: coverFile?.name || release.coverSourceName,
        coverSourcePath: (coverFile as (File & { path?: string }) | null)?.path || release.coverSourcePath,
        latestError: null,
        statusMessage: '音频与封面已上传到 Pinata',
        activityEntry: { message: 'Assets uploaded', level: 'success' },
      });
    } catch (error) {
      return await updateCreatorRelease(baseUrl, release.id, {
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: '素材上传失败',
        activityEntry: {
          message: `Asset upload failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      });
    }
  },
);

export const uploadMetadataThunk = createAsyncThunk<
  CreatorReleaseRecord,
  { baseUrl: string; release: CreatorReleaseRecord; metadataDocument: unknown }
>(
  'musicWorkshop/uploadMetadata',
  async ({ baseUrl, release, metadataDocument }) => {
    try {
      const metadataFile = new File(
        [JSON.stringify(metadataDocument, null, 2)],
        `${slugify(release.title || 'untitled-track')}-metadata.json`,
        { type: 'application/json' },
      );

      const result = await uploadFileToWeb25Pinata(baseUrl, {
        file: metadataFile,
        name: `${slugify(release.title || 'untitled-track')}-metadata`,
        keyvalues: {
          kind: 'metadata',
          releaseId: release.id,
          artist: release.artistName || 'unknown',
        },
      });

      return await updateCreatorRelease(baseUrl, release.id, {
        status: 'METADATA_UPLOADED',
        currentStage: 'publish',
        metadataStorageObjectId: result.storageObjectId,
        metadataDocument,
        latestError: null,
        statusMessage: 'Metadata 已上传',
        activityEntry: { message: `Metadata uploaded: ${result.cid}`, level: 'success' },
      });
    } catch (error) {
      return await updateCreatorRelease(baseUrl, release.id, {
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: 'Metadata 上传失败',
        activityEntry: {
          message: `Metadata upload failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      });
    }
  },
);

export type PublishReleaseResult = {
  release: CreatorReleaseRecord;
  accessCheck: AccessCheckState | null;
};

export const publishReleaseThunk = createAsyncThunk<
  PublishReleaseResult,
  {
    baseUrl: string;
    release: CreatorReleaseRecord;
    walletProvider: WalletProviderLike;
    fallbackAddress?: string | null;
    effectiveWeb3Settings: EffectiveWeb3Settings;
  }
>(
  'musicWorkshop/publishRelease',
  async ({ baseUrl, release, walletProvider, fallbackAddress, effectiveWeb3Settings }) => {
    try {
      const metadataUri = metadataUriForRelease(release);
      if (!metadataUri) {
        throw new Error('Metadata URI not ready');
      }

      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const artistAddress = fallbackAddress || await signer.getAddress();
      const splits = normalizeSplits(release, artistAddress);
      const requiresPurchase = release.accessModel === 'purchase';
      const priceWei = requiresPurchase ? parseEther(release.priceEth.trim() || '0') : BigInt(0);
      if (requiresPurchase && priceWei <= BigInt(0)) {
        throw new Error('购买模式需要填写大于 0 的 ETH 价格，或将访问模式改为公开可访问');
      }

      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);

      await updateCreatorRelease(baseUrl, release.id, {
        status: 'PUBLISHING',
        currentStage: 'publish',
        latestError: null,
        statusMessage: '等待钱包确认链上发布交易',
        chainId: effectiveWeb3Settings.chainId,
        chainName: effectiveWeb3Settings.chainName,
        explorerUrl: effectiveWeb3Settings.explorerUrl,
        musicAssetAddress: effectiveWeb3Settings.musicAssetAddress,
        royaltySplitterFactoryAddress: effectiveWeb3Settings.royaltySplitterFactoryAddress,
        platformHubAddress: effectiveWeb3Settings.platformHubAddress,
        royaltySplits: splits,
      });

      const publishTx = await platformHub.publishTrack(
        metadataUri,
        release.royaltyBps,
        requiresPurchase,
        priceWei,
        true,
        splits.map((item) => item.address),
        splits.map((item) => item.share),
      );

      await updateCreatorRelease(baseUrl, release.id, {
        status: 'PUBLISHING',
        publishTxHash: publishTx.hash,
        statusMessage: '链上交易已发出，等待确认',
        activityEntry: { message: `Publish tx submitted: ${publishTx.hash}`, level: 'info' },
      });

      const publishReceipt = await publishTx.wait();
      if (!publishReceipt) {
        throw new Error('Publish transaction receipt not found');
      }

      let publishedTokenId: string | null = null;
      let publishedCreator: string | null = null;
      let publishedPayoutReceiver: string | null = null;

      for (const log of publishReceipt.logs) {
        try {
          const parsedLog = platformHub.interface.parseLog(log);
          if (!parsedLog || parsedLog.name !== 'TrackPublished') {
            continue;
          }
          const tokenId = parsedLog.args[0]?.toString?.();
          const creator = parsedLog.args[1];
          const payoutReceiver = parsedLog.args[2];
          if (!tokenId || typeof creator !== 'string' || typeof payoutReceiver !== 'string') {
            continue;
          }
          publishedTokenId = tokenId;
          publishedCreator = creator;
          publishedPayoutReceiver = payoutReceiver;
          break;
        } catch {
          continue;
        }
      }

      if (!publishedTokenId || !publishedPayoutReceiver) {
        throw new Error('Publish receipt missing TrackPublished event');
      }

      if (!publishedCreator) {
        publishedCreator = artistAddress;
      }

      const updated = await updateCreatorRelease(baseUrl, release.id, {
        status: 'PUBLISHED',
        currentStage: 'access',
        splitterAddress: publishedPayoutReceiver,
        publishTxHash: publishTx.hash,
        publishBlockNumber: publishReceipt.blockNumber,
        tokenId: publishedTokenId,
        latestError: null,
        statusMessage: `作品已发布：Token #${publishedTokenId}`,
        activityEntry: { message: `Published token #${publishedTokenId}`, level: 'success' },
      });

      return {
        release: updated,
        accessCheck: {
          tokenId: publishedTokenId,
          creator: publishedCreator,
          payoutReceiver: publishedPayoutReceiver,
          priceEth: requiresPurchase ? release.priceEth : '0',
          requiresPurchase,
          active: true,
          hasAccess: requiresPurchase ? null : true,
          platformFeeEth: '',
          creatorProceedsEth: '',
          lastUpdated: '已根据链上回执更新作品编号',
        },
      };
    } catch (error) {
      const failed = await updateCreatorRelease(baseUrl, release.id, {
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: '链上发布失败',
        activityEntry: {
          message: `Publish failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      });

      return { release: failed, accessCheck: null };
    }
  },
);

export const refreshAccessThunk = createAsyncThunk<
  AccessCheckState,
  { walletProvider: WalletProviderLike; tokenId: string; platformHubAddress: string; fallbackAddress?: string | null }
>(
  'musicWorkshop/refreshAccess',
  async ({ walletProvider, tokenId, platformHubAddress, fallbackAddress }) => {
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    const currentAddress = fallbackAddress || await signer.getAddress();
    const platformHub = new Contract(platformHubAddress, PLATFORM_HUB_ABI, signer);
    const [creator, payoutReceiver, price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(tokenId);
    const hasAccess = await platformHub.hasAccess(currentAddress, tokenId);
    const [, platformFee, creatorProceeds] = await platformHub.paymentPreview(tokenId);

    return {
      tokenId,
      creator,
      payoutReceiver,
      priceEth: formatEther(price),
      requiresPurchase,
      active,
      hasAccess,
      platformFeeEth: formatEther(platformFee),
      creatorProceedsEth: formatEther(creatorProceeds),
      lastUpdated: `已查询 ${currentAddress.slice(0, 6)}... 的授权状态`,
    };
  },
);

export const buyAccessThunk = createAsyncThunk<
  CreatorReleaseRecord | null,
  {
    baseUrl: string;
    releaseId: string;
    tokenId: string;
    walletProvider: WalletProviderLike;
    platformHubAddress: string;
  }
>(
  'musicWorkshop/buyAccess',
  async ({ baseUrl, releaseId, tokenId, walletProvider, platformHubAddress }) => {
    const provider = new BrowserProvider(walletProvider);
    const signer = await provider.getSigner();
    const platformHub = new Contract(platformHubAddress, PLATFORM_HUB_ABI, signer);
    const [, , price, requiresPurchase] = await platformHub.getTrackSaleConfig(tokenId);
    if (!requiresPurchase) {
      return null;
    }

    const buyTx = await platformHub.buyAccess(tokenId, { value: price });
    await buyTx.wait();

    return await updateCreatorRelease(baseUrl, releaseId, {
      purchaseTxHash: buyTx.hash,
      statusMessage: `访问权购买成功：${buyTx.hash.slice(0, 10)}...`,
      activityEntry: { message: `Access purchased: ${buyTx.hash}`, level: 'success' },
    });
  },
);
