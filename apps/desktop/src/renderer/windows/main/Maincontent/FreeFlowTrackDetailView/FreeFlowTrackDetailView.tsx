import React from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { mergeTrackWithFreeFlowInfo, upsertChainLibraryTrack } from '@renderer/core/freeflow/chainLibrary';
import { resolveIndexedTrackResource, upsertWeb25Purchase } from '@renderer/core/web25/client';
import { useWeb25SessionState } from '@renderer/core/web25/auth';
import PlayerController from '@renderer/core/controller/PlayerController';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
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

export default function FreeFlowTrackDetailView({ track, player }: FreeFlowTrackDetailViewProps) {
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
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

  const identityAddress = activeProfile?.walletAddress ?? session?.address ?? address ?? null;
  const signingWalletMismatch = Boolean(identityAddress && address && !sameAddress(identityAddress, address));
  const requiresPurchase = accessStatus.requiresPurchase ?? (info ? info.accessModel === 'purchase' : null);
  const isPublicAccess = !!info && requiresPurchase === false;
  const saleActive = accessStatus.active !== false;
  const hasPurchasedAccess = hasPositiveBalance(accessStatus.ownedBalance);
  const isCreatorAddress = sameAddress(identityAddress, accessStatus.creator);
  const canPlay = !!info && (isPublicAccess || hasPurchasedAccess || isCreatorAddress);
  const canAddToChainLibrary = !!info && (isPublicAccess || hasPurchasedAccess);
  const needsGuideForPurchase = !isConnected || !walletProvider || !identityAddress || signingWalletMismatch;

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
    ? '返回 Profile 引导'
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
    if (!walletProvider || !info?.tokenId) return;

    setRefreshingAccess(true);
    setAccessError('');
    try {
      const provider = new BrowserProvider(walletProvider);
      const hubAddress = info.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;
      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, provider);
      const [creator, , price, requiresPurchaseOnChain, active] = await platformHub.getTrackSaleConfig(info.tokenId);

      let ownedBalance: bigint | null = null;
      if (identityAddress) {
        const musicAccessAddress = info.contractAddress || DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress;
        const musicAccess = new Contract(musicAccessAddress, MUSIC_ACCESS_1155_ABI, provider);
        ownedBalance = await musicAccess.balanceOf(identityAddress, info.tokenId).catch((): null => null);
      }

      const nextPriceEth = formatEther(price);
      setAccessStatus({
        requiresPurchase: requiresPurchaseOnChain,
        active,
        priceEth: nextPriceEth,
        creator: typeof creator === 'string' ? creator : null,
        ownedBalance: ownedBalance?.toString() ?? null,
        checkedAddress: identityAddress,
      });

      if (nextPriceEth !== info.priceEth) {
        setInfo((prev) => prev ? { ...prev, priceEth: nextPriceEth } : prev);
      }
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? ''));
    } finally {
      setRefreshingAccess(false);
    }
  }, [identityAddress, info, walletProvider]);

  React.useEffect(() => {
    if (!walletProvider || !info?.tokenId) return;
    void refreshAccess();
  }, [info?.platformHubAddress, info?.tokenId, refreshAccess, walletProvider]);

  const handleBuyAccess = React.useCallback(async () => {
    if (!walletProvider || !identityAddress || !info?.tokenId) return;

    setBuying(true);
    setAccessError('');
    setLibraryMessage('');
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (!sameAddress(signerAddress, identityAddress)) {
        throw new Error(`当前签名钱包 ${signerAddress} 与当前 Profile ${identityAddress} 不一致，请返回引导切换钱包后重试。`);
      }

      const hubAddress = info.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;
      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, signer);
      const [creator, , price, requiresPurchaseOnChain, active] = await platformHub.getTrackSaleConfig(info.tokenId);

      if (!active) {
        throw new Error('该作品当前未开放购买。');
      }
      if (!requiresPurchaseOnChain) {
        await addCurrentTrackToChainLibrary(info);
        setLibraryMessage('公开作品已加入链上音乐库。');
        await refreshAccess();
        return;
      }
      if (sameAddress(creator, signerAddress)) {
        throw new Error('创作者默认拥有播放权限，不能购买自己的作品。');
      }

      const buyTx = await platformHub.buyAccess(info.tokenId, { value: price });
      const receipt = await buyTx.wait();
      const purchaseChainId = info.chainId ?? DEFAULT_SEPOLIA_CONTRACTS.chainId;
      if (info.releaseId) {
        await upsertWeb25Purchase(web25BaseUrl.value, {
          releaseId: info.releaseId,
          walletAddress: signerAddress,
          chainId: purchaseChainId,
          txHash: buyTx.hash,
          amountWei: price.toString(),
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

            {signingWalletMismatch && (
              <div className={styles.warning}>
                当前 Profile 为 {formatAddress(identityAddress)}，签名钱包为 {formatAddress(address)}。
              </div>
            )}

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
                      void profileContext.exitToGuide();
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
