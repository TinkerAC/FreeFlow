import React from 'react';
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, isAddress } from 'ethers';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { mergeTrackWithFreeFlowInfo, upsertChainLibraryTrack } from '@renderer/core/freeflow/chainLibrary';
import { resolveIndexedTrackResource, upsertWeb25Purchase } from '@renderer/core/web25/client';
import { useWeb25SessionState } from '@renderer/core/web25/auth';
import { getProfileSigner } from '@renderer/core/web3/profileSigner';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import PlayerController from '@renderer/core/controller/PlayerController';
import { profileContext } from '@renderer/core/electronContextApi';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import { FreeFlowTrackInfo, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { ProfileSummary } from '@src/shared/profile/profile';
import { DEFAULT_SEPOLIA_CONTRACTS, MUSIC_ACCESS_1155_ABI, PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';
import styles from './FreeFlowTrackDetailView.module.css';

interface FreeFlowTrackDetailViewProps {
  track: TrackEntity;
  player: PlayerController;
}

type AccessStatus = {
  requiresPurchase: boolean | null;
  active: boolean | null;
  priceEth: string | null;
  creator: string | null;
  ownedBalance: string | null;
  checkedAddress: string | null;
  hubAddress: string | null;
  musicAssetAddress: string | null;
};

type TrackSaleSnapshot = {
  hubAddress: string;
  creator: string;
  price: bigint;
  requiresPurchase: boolean;
  active: boolean;
  musicAssetAddress: string | null;
};

function mapToInfo(payload: Awaited<ReturnType<typeof resolveIndexedTrackResource>>): FreeFlowTrackInfo {
  return {
    resourceKey: payload.resourceKey,
    chainId: payload.chainId,
    contractAddress: payload.contractAddress,
    tokenId: payload.tokenId,
    accessModel: payload.accessModel,
    previewSeconds: payload.previewSeconds,
    priceEth: payload.priceEth,
    coverUrl: payload.coverUrl,
    coverCid: payload.coverCid,
    audioUrl: payload.audioUrl,
    audioCid: payload.audioCid,
    metadataUrl: payload.metadataUrl,
    metadataCid: payload.metadataCid,
    explorerUrl: payload.explorerUrl,
    platformHubAddress: payload.platformHubAddress,
    publishTxHash: payload.publishTxHash,
    releaseId: payload.releaseId,
    status: payload.status,
    metadataDocument: payload.metadataDocument,
  };
}

function createAccessStatus(info: FreeFlowTrackInfo | null): AccessStatus {
  return {
    requiresPurchase: info ? info.accessModel === 'purchase' : null,
    active: null,
    priceEth: info?.priceEth ?? null,
    creator: null,
    ownedBalance: null,
    checkedAddress: null,
    hubAddress: info?.platformHubAddress ?? null,
    musicAssetAddress: info?.contractAddress ?? null,
  };
}

function formatPrice(priceEth: string | null) {
  if (!priceEth) return '-';
  return `${priceEth} ETH`;
}

function formatAddress(value?: string | null) {
  if (!value) return '-';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
}

function sameAddress(left?: string | null, right?: string | null) {
  return !!left && !!right && left.toLowerCase() === right.toLowerCase();
}

function hasPositiveBalance(value?: string | null) {
  if (!value) return false;
  try {
    return BigInt(value) > BigInt(0);
  } catch {
    return Number(value) > 0;
  }
}

function normalizeAddress(value?: string | null): string | null {
  const next = String(value || '').trim();
  if (!next || !isAddress(next)) return null;
  return next;
}

function buildAddressCandidates(...values: Array<string | null | undefined>): string[] {
  const results: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const address = normalizeAddress(value);
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(address);
  }
  return results;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? 'unknown error');
}

async function resolveTrackSaleSnapshot(
  provider: BrowserProvider | JsonRpcProvider,
  tokenId: string,
  hubCandidates: string[],
): Promise<TrackSaleSnapshot> {
  const failures: string[] = [];

  for (const hubAddress of hubCandidates) {
    try {
      const code = await provider.getCode(hubAddress);
      if (!code || code === '0x') {
        failures.push(`${hubAddress}: no-contract-code`);
        continue;
      }

      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, provider);
      const [creator, , price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(tokenId);
      let musicAssetAddress: string | null = null;
      try {
        musicAssetAddress = normalizeAddress(await platformHub.musicAsset());
      } catch {
        // ignore; fallback candidates below will handle legacy data
      }

      return {
        hubAddress,
        creator: typeof creator === 'string' ? creator : '',
        price: BigInt(price),
        requiresPurchase: Boolean(requiresPurchase),
        active: Boolean(active),
        musicAssetAddress,
      };
    } catch (error) {
      failures.push(`${hubAddress}: ${errorMessage(error)}`);
    }
  }

  throw new Error(`无法读取 getTrackSaleConfig。候选地址: ${failures.join(' | ')}`);
}

async function resolveOwnedBalance(
  provider: BrowserProvider | JsonRpcProvider,
  account: string,
  tokenId: string,
  musicAssetCandidates: string[],
): Promise<{ musicAssetAddress: string | null; ownedBalance: bigint | null }> {
  const failures: string[] = [];

  for (const musicAssetAddress of musicAssetCandidates) {
    try {
      const code = await provider.getCode(musicAssetAddress);
      if (!code || code === '0x') {
        failures.push(`${musicAssetAddress}: no-contract-code`);
        continue;
      }
      const musicAccess = new Contract(musicAssetAddress, MUSIC_ACCESS_1155_ABI, provider);
      const ownedBalance = await musicAccess.balanceOf(account, tokenId);
      return { musicAssetAddress, ownedBalance: BigInt(ownedBalance) };
    } catch (error) {
      failures.push(`${musicAssetAddress}: ${errorMessage(error)}`);
    }
  }

  if (failures.length) {
    console.warn(`[FreeFlow] resolveOwnedBalance failed: ${failures.join(' | ')}`);
  }
  return { musicAssetAddress: null, ownedBalance: null };
}

export default function FreeFlowTrackDetailView({ track, player }: FreeFlowTrackDetailViewProps) {
  const { address, isConnected, walletProvider } = useWalletRuntimeState();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session } = useWeb25SessionState(web25BaseUrl.value);
  const [info, setInfo] = React.useState<FreeFlowTrackInfo | null>(track.freeflow ?? null);
  const [activeProfile, setActiveProfile] = React.useState<ProfileSummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [refreshingAccess, setRefreshingAccess] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const [addingToLibrary, setAddingToLibrary] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const [libraryMessage, setLibraryMessage] = React.useState('');
  const [accessStatus, setAccessStatus] = React.useState<AccessStatus>(() => createAccessStatus(track.freeflow ?? null));

  const infoTokenId = info?.tokenId ? String(info.tokenId) : null;
  const infoHubAddress = info?.platformHubAddress ?? null;
  const infoMusicAssetAddress = info?.contractAddress ?? null;

  const identityAddress = activeProfile?.walletAddress ?? session?.address ?? address ?? null;
  const requiresPurchase = accessStatus.requiresPurchase ?? (info ? info.accessModel === 'purchase' : null);
  const isPublicAccess = !!info && requiresPurchase === false;
  const saleActive = accessStatus.active !== false;
  const hasPurchasedAccess = hasPositiveBalance(accessStatus.ownedBalance);
  const isCreatorAddress = sameAddress(identityAddress, accessStatus.creator);
  const canPlay = !!info && (isPublicAccess || hasPurchasedAccess || isCreatorAddress);
  const canAddToChainLibrary = !!info && (isPublicAccess || hasPurchasedAccess);
  const needsGuideForPurchase = !isConnected || !walletProvider || !identityAddress;

  const accessLabel = !info
    ? '加载中'
    : isPublicAccess
    ? '公开访问'
    : hasPurchasedAccess
      ? '已购买'
      : isCreatorAddress
        ? '创作者访问'
        : saleActive
          ? '需要购买'
          : '暂未开放';
  const priceLabel = isPublicAccess ? '公开' : formatPrice(accessStatus.priceEth ?? info?.priceEth ?? null);
  const purchaseLabel = needsGuideForPurchase
    ? '重启并选择 Profile'
    : buying
      ? '购买中...'
      : `购买 ${priceLabel}`;
  const libraryButtonLabel = addingToLibrary
    ? '添加中...'
    : canAddToChainLibrary
      ? '加入链上音乐库'
      : '购买后加入';

  React.useEffect(() => {
    void profileContext.getActiveProfile()
      .then(setActiveProfile)
      .catch(() => setActiveProfile(null));
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const nextInfo = track.freeflow ?? null;

    setInfo(nextInfo);
    setError('');
    setAccessError('');
    setLibraryMessage('');
    setAccessStatus(createAccessStatus(nextInfo));

    const needFetch = !nextInfo || (!nextInfo.audioUrl && !nextInfo.metadataUrl);
    if (!needFetch) {
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void resolveIndexedTrackResource(web25BaseUrl.value, track.platform_unique_id)
      .then((payload) => {
        if (cancelled) return;
        setInfo(mapToInfo(payload));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err ?? ''));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [track.platform_unique_id, track.freeflow, web25BaseUrl.value]);

  const addCurrentTrackToChainLibrary = React.useCallback(async (targetInfo: FreeFlowTrackInfo) => {
    await upsertChainLibraryTrack(mergeTrackWithFreeFlowInfo(track, targetInfo));
  }, [track]);

  const refreshAccess = React.useCallback(async () => {
    if (!infoTokenId) return;

    setRefreshingAccess(true);
    setAccessError('');
    try {
      const readProvider = new JsonRpcProvider(
        DEFAULT_SEPOLIA_CONTRACTS.rpcUrl,
        DEFAULT_SEPOLIA_CONTRACTS.chainId,
      );
      const tokenId = infoTokenId;
      const hubCandidates = buildAddressCandidates(
        infoHubAddress,
        DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress,
      );
      const sale = await resolveTrackSaleSnapshot(readProvider, tokenId, hubCandidates);
      const musicAssetCandidates = buildAddressCandidates(
        infoMusicAssetAddress,
        sale.musicAssetAddress,
        DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress,
      );

      let ownedBalance: bigint | null = null;
      let resolvedMusicAssetAddress: string | null = sale.musicAssetAddress;
      if (identityAddress) {
        const balanceResult = await resolveOwnedBalance(readProvider, identityAddress, tokenId, musicAssetCandidates);
        ownedBalance = balanceResult.ownedBalance;
        if (balanceResult.musicAssetAddress) {
          resolvedMusicAssetAddress = balanceResult.musicAssetAddress;
        }
      }

      const nextPriceEth = formatEther(sale.price);
      setAccessStatus({
        requiresPurchase: sale.requiresPurchase,
        active: sale.active,
        priceEth: nextPriceEth,
        creator: sale.creator || null,
        ownedBalance: ownedBalance?.toString() ?? null,
        checkedAddress: identityAddress,
        hubAddress: sale.hubAddress,
        musicAssetAddress: resolvedMusicAssetAddress,
      });

      setInfo((prev) => {
        if (!prev) return prev;
        const nextContractAddress = resolvedMusicAssetAddress ?? prev.contractAddress;
        if (
          prev.priceEth === nextPriceEth
          && prev.platformHubAddress === sale.hubAddress
          && prev.contractAddress === nextContractAddress
        ) {
          return prev;
        }
        return {
          ...prev,
          priceEth: nextPriceEth,
          platformHubAddress: sale.hubAddress,
          contractAddress: nextContractAddress,
        };
      });
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? ''));
    } finally {
      setRefreshingAccess(false);
    }
  }, [identityAddress, infoHubAddress, infoMusicAssetAddress, infoTokenId]);

  React.useEffect(() => {
    if (!infoTokenId) return;
    void refreshAccess();
  }, [infoTokenId, infoHubAddress, identityAddress, refreshAccess]);

  const handleBuyAccess = React.useCallback(async () => {
    if (!walletProvider || !identityAddress || !info?.tokenId) return;

    setBuying(true);
    setAccessError('');
    setLibraryMessage('');
    try {
      const tokenId = infoTokenId;
      if (!tokenId) {
        throw new Error('缺少 tokenId，无法购买。');
      }
      const { provider, signer, signerAddress } = await getProfileSigner(walletProvider, identityAddress);
      const hubCandidates = buildAddressCandidates(
        infoHubAddress,
        DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress,
      );
      const sale = await resolveTrackSaleSnapshot(provider, tokenId, hubCandidates);
      const platformHub = new Contract(sale.hubAddress, PLATFORM_HUB_ABI, signer);

      if (!sale.active) {
        throw new Error('该作品当前未开放购买。');
      }
      if (!sale.requiresPurchase) {
        await addCurrentTrackToChainLibrary(info);
        setLibraryMessage('公开作品已加入链上音乐库。');
        await refreshAccess();
        return;
      }
      if (sameAddress(sale.creator, signerAddress)) {
        throw new Error('创作者默认拥有播放权限，不能购买自己的作品。');
      }

      const buyTx = await platformHub.buyAccess(tokenId, { value: sale.price });
      const receipt = await buyTx.wait();
      const purchaseChainId = Number((await provider.getNetwork()).chainId || DEFAULT_SEPOLIA_CONTRACTS.chainId);
      if (info.releaseId) {
        await upsertWeb25Purchase(web25BaseUrl.value, {
          releaseId: info.releaseId,
          walletAddress: signerAddress,
          chainId: purchaseChainId,
          txHash: buyTx.hash,
          amountWei: sale.price.toString(),
          status: 'confirmed',
          purchasedAt: new Date().toISOString(),
        }).catch((): undefined => undefined);
      }

      await addCurrentTrackToChainLibrary(info);
      setLibraryMessage(`购买成功，已加入链上音乐库${receipt?.blockNumber ? `。区块 ${receipt.blockNumber}` : '。'}`);
      await refreshAccess();
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? ''));
    } finally {
      setBuying(false);
    }
  }, [
    addCurrentTrackToChainLibrary,
    identityAddress,
    info,
    infoHubAddress,
    infoTokenId,
    refreshAccess,
    walletProvider,
    web25BaseUrl.value,
  ]);

  const handleAddToChainLibrary = React.useCallback(async () => {
    if (!info) return;
    if (!canAddToChainLibrary) {
      setAccessError('付费作品需要先购买访问凭证。');
      return;
    }

    setAddingToLibrary(true);
    setAccessError('');
    setLibraryMessage('');
    try {
      await addCurrentTrackToChainLibrary(info);
      setLibraryMessage(isPublicAccess ? '公开作品已加入链上音乐库。' : '已加入链上音乐库。');
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? '链上音乐库写入失败'));
    } finally {
      setAddingToLibrary(false);
    }
  }, [addCurrentTrackToChainLibrary, canAddToChainLibrary, info, isPublicAccess]);

  return (
    <ViewShell hideScrollbar className={styles.shell} contentClassName={styles.shellContent}>
      <main className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.coverFrame}>
            <img
              src={info?.coverUrl || track.cover_src || DefaultCover}
              alt={track.title || 'cover'}
              className={styles.cover}
              referrerPolicy="no-referrer"
              onError={(event) => {
                (event.target as HTMLImageElement).src = DefaultCover;
              }}
            />
          </div>

          <div className={styles.heroBody}>
            <div className={styles.kicker}>
              <PlatformIcon platform={track.platform} size={18} />
              <span>FreeFlow</span>
              <span className={styles.dot} />
              <span>{formatDuration(track.duration || info?.previewSeconds || undefined)}</span>
            </div>

            <h1 className={styles.title}>{track.title || 'Untitled Track'}</h1>
            <div className={styles.artist}>{track.artist || 'Unknown Artist'}</div>
            {track.album && <div className={styles.album}>{track.album}</div>}

            <div className={styles.statusRow}>
              <span className={styles.accessPill}>{accessLabel}</span>
              <span className={styles.pricePill}>{priceLabel}</span>
              {accessStatus.creator && (
                <span className={styles.mutedText}>创作者 {formatAddress(accessStatus.creator)}</span>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => player.addTrackToNextAndPlay(track)}
                disabled={!canPlay}
              >
                {canPlay ? '播放' : '购买后播放'}
              </button>

              {requiresPurchase && !hasPurchasedAccess && !isCreatorAddress && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => {
                    if (needsGuideForPurchase) {
                      void profileContext.restartToGuide();
                      return;
                    }
                    void handleBuyAccess();
                  }}
                  disabled={buying || refreshingAccess || !saleActive}
                >
                  {saleActive ? purchaseLabel : '暂未开放购买'}
                </button>
              )}

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void handleAddToChainLibrary()}
                disabled={!canAddToChainLibrary || addingToLibrary}
              >
                {libraryButtonLabel}
              </button>

              <button
                type="button"
                className={styles.textButton}
                onClick={() => void refreshAccess()}
                disabled={!walletProvider || !info?.tokenId || refreshingAccess}
              >
                {refreshingAccess ? '刷新中' : '刷新状态'}
              </button>
            </div>
          </div>
        </section>

        {(libraryMessage || accessError || error || loading) && (
          <section className={styles.feedback}>
            {loading && <span>正在加载链上资源...</span>}
            {libraryMessage && <span className={styles.notice}>{libraryMessage}</span>}
            {accessError && <span className={styles.error}>链上操作失败：{accessError}</span>}
            {!loading && error && <span className={styles.error}>详情加载失败：{error}</span>}
          </section>
        )}

        <section className={styles.summary}>
          <div className={styles.summaryItem}>
            <span>访问状态</span>
            <strong>{accessLabel}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>价格</span>
            <strong>{priceLabel}</strong>
          </div>
          <div className={styles.summaryItem}>
            <span>当前 Profile</span>
            <strong>{formatAddress(accessStatus.checkedAddress ?? identityAddress)}</strong>
          </div>
        </section>

        {(info?.metadataUrl || (info?.explorerUrl && info?.publishTxHash)) && (
          <details className={styles.chainDetails}>
            <summary>链上记录</summary>
            <div className={styles.linkRow}>
              {info?.metadataUrl && (
                <a href={info.metadataUrl} target="_blank" rel="noreferrer">Metadata</a>
              )}
              {info?.explorerUrl && info?.publishTxHash && (
                <a
                  href={`${info.explorerUrl.replace(/\/$/, '')}/tx/${info.publishTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  发行交易
                </a>
              )}
            </div>
          </details>
        )}
      </main>
    </ViewShell>
  );
}
