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

function formatPrice(priceEth: string | null) {
  if (!priceEth) return '-';
  return `${priceEth} ETH`;
}

function formatAddress(value?: string | null) {
  if (!value) return '-';
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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
  const [accessStatus, setAccessStatus] = React.useState<{
    hasAccess: boolean | null;
    requiresPurchase: boolean | null;
    active: boolean | null;
    priceEth: string | null;
    payoutReceiver: string | null;
    creator: string | null;
    ownedBalance: string | null;
    checkedAddress: string | null;
  }>({
    hasAccess: null,
    requiresPurchase: info?.accessModel === 'purchase',
    active: true,
    priceEth: info?.priceEth ?? null,
    payoutReceiver: null,
    creator: null,
    ownedBalance: null,
    checkedAddress: null,
  });
  const identityAddress = activeProfile?.walletAddress ?? session?.address ?? address ?? null;
  const signingWalletMismatch = Boolean(identityAddress && address && !sameAddress(identityAddress, address));

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
    setLibraryMessage('');
    setAccessStatus({
      hasAccess: null,
      requiresPurchase: nextInfo?.accessModel === 'purchase',
      active: null,
      priceEth: nextInfo?.priceEth ?? null,
      payoutReceiver: null,
      creator: null,
      ownedBalance: null,
      checkedAddress: null,
    });

    const needFetch = !nextInfo || (!nextInfo.audioUrl && !nextInfo.metadataUrl);
    if (!needFetch) return () => {
      cancelled = true;
    };

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

  const refreshAccess = React.useCallback(async () => {
    if (!walletProvider || !info?.tokenId) return;

    setRefreshingAccess(true);
    setAccessError('');
    try {
      const provider = new BrowserProvider(walletProvider);
      const hubAddress = info.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;
      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, provider);
      const [creator, payoutReceiver, price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(info.tokenId);

      let hasAccess: boolean | null = null;
      let ownedBalance: bigint | null = null;
      if (identityAddress) {
        hasAccess = await platformHub.hasAccess(identityAddress, info.tokenId);
        const musicAccessAddress = info.contractAddress || DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress;
        const musicAccess = new Contract(musicAccessAddress, MUSIC_ACCESS_1155_ABI, provider);
        ownedBalance = await musicAccess.balanceOf(identityAddress, info.tokenId).catch((): null => null);
      }

      const nextPriceEth = formatEther(price);
      setAccessStatus({
        hasAccess,
        requiresPurchase,
        active,
        priceEth: nextPriceEth,
        payoutReceiver: typeof payoutReceiver === 'string' ? payoutReceiver : null,
        creator: typeof creator === 'string' ? creator : null,
        ownedBalance: ownedBalance?.toString() ?? null,
        checkedAddress: identityAddress,
      });

      if (nextPriceEth !== info.priceEth) {
        setInfo((prev) => prev ? { ...prev, priceEth: nextPriceEth } : prev);
      }
      if (!creator) {
        setAccessError('未获取到创作者地址，请检查合约配置');
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
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      if (!sameAddress(signerAddress, identityAddress)) {
        throw new Error(`当前签名钱包 ${signerAddress} 与当前 Profile ${identityAddress} 不一致，请返回引导切换钱包后重试。`);
      }

      const hubAddress = info.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;
      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, signer);
      const [creator, , price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(info.tokenId);

      if (!active) {
        throw new Error('该资源当前不开放购买');
      }
      if (!requiresPurchase) {
        await refreshAccess();
        return;
      }
      if (sameAddress(creator, signerAddress)) {
        throw new Error('创作者默认拥有播放访问权，但没有 ERC-1155 购买凭证余额，不能购买自己的作品。');
      }

      const buyTx = await platformHub.buyAccess(info.tokenId, { value: price });
      await buyTx.wait();
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

      await refreshAccess();
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? ''));
    } finally {
      setBuying(false);
    }
  }, [identityAddress, info, refreshAccess, walletProvider, web25BaseUrl.value]);

  const requiresPurchase = accessStatus.requiresPurchase ?? (info?.accessModel === 'purchase');
  const hasAccess = accessStatus.hasAccess;
  const hasPurchasedAccess = hasPositiveBalance(accessStatus.ownedBalance);
  const isCreatorAddress = sameAddress(identityAddress, accessStatus.creator);
  const canPlay = !requiresPurchase || hasPurchasedAccess || isCreatorAddress || !!hasAccess;
  const canAddToChainLibrary = !!info && hasPurchasedAccess;
  const needsGuideForPurchase = !isConnected || !walletProvider || !identityAddress || signingWalletMismatch;
  const accessBadgeText = hasPurchasedAccess
    ? '已购买凭证'
    : isCreatorAddress
      ? '创作者可访问'
      : !requiresPurchase
        ? '公开访问'
        : hasAccess
          ? '可访问'
          : '未购买';
  const purchaseButtonText = needsGuideForPurchase
    ? '返回 Profile 引导'
    : hasPurchasedAccess
      ? '已持有访问凭证'
      : isCreatorAddress
        ? '创作者无需购买'
        : buying
          ? '购买中...'
          : `购买 ${formatPrice(accessStatus.priceEth ?? info?.priceEth ?? null)}`;

  const handleAddToChainLibrary = React.useCallback(async () => {
    if (!info) return;
    if (!hasPurchasedAccess) {
      setAccessError('链上音乐库只收录当前 Profile 持有 ERC-1155 访问凭证的曲目，请先购买。');
      return;
    }

    setAddingToLibrary(true);
    setAccessError('');
    setLibraryMessage('');
    try {
      await upsertChainLibraryTrack(mergeTrackWithFreeFlowInfo(track, info));
      setLibraryMessage('已添加到链上音乐库');
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? '链上音乐库写入失败'));
    } finally {
      setAddingToLibrary(false);
    }
  }, [hasPurchasedAccess, info, track]);

  return (
    <ViewShell padded hideScrollbar>
      <div className={styles.container}>
        <section className={styles.header}>
          <img
            src={info?.coverUrl || track.cover_src || DefaultCover}
            alt={track.title || 'cover'}
            className={styles.cover}
            referrerPolicy="no-referrer"
            onError={(event) => {
              (event.target as HTMLImageElement).src = DefaultCover;
            }}
          />
          <div className={styles.headerBody}>
            <h1 className={styles.title}>{track.title || 'Untitled Track'}</h1>
            <div className={styles.subtitle}>{track.artist || 'Unknown Artist'}</div>
            <div className={styles.platformRow}>
              <PlatformIcon platform={track.platform} size={18} />
              <span>FreeFlow</span>
            </div>
            <div className={styles.actionRow}>
              <button
                className={styles.primaryButton}
                onClick={() => player.addTrackToNextAndPlay(track)}
                disabled={!canPlay}
                title={canPlay ? '播放' : '该资源需要先购买访问权'}
              >
                {canPlay ? '播放' : '需要购买后播放'}
              </button>
              {requiresPurchase && (
                <button
                  className={styles.primaryButton}
                  onClick={() => {
                    if (needsGuideForPurchase) {
                      void profileContext.exitToGuide();
                      return;
                    }
                    void handleBuyAccess();
                  }}
                  disabled={buying || refreshingAccess || hasPurchasedAccess || isCreatorAddress}
                >
                  {purchaseButtonText}
                </button>
              )}
              <button
                className={styles.ghostButton}
                onClick={() => void handleAddToChainLibrary()}
                disabled={!canAddToChainLibrary || addingToLibrary}
                title={canAddToChainLibrary ? '添加到链上音乐库' : '需要当前 Profile 持有 ERC-1155 访问凭证'}
              >
                {addingToLibrary ? '添加中...' : (hasPurchasedAccess ? '添加到链上音乐库' : '未持有凭证')}
              </button>
              <button
                className={styles.ghostButton}
                onClick={() => void refreshAccess()}
                disabled={!walletProvider || !info?.tokenId || refreshingAccess}
              >
                {refreshingAccess ? '刷新中...' : '刷新访问状态'}
              </button>
              {info?.metadataUrl && (
                <a className={styles.ghostButton} href={info.metadataUrl} target="_blank" rel="noreferrer">Metadata</a>
              )}
              {info?.explorerUrl && info?.publishTxHash && (
                <a
                  className={styles.ghostButton}
                  href={`${info.explorerUrl.replace(/\/$/, '')}/tx/${info.publishTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                >交易</a>
              )}
            </div>
            {requiresPurchase && (
              <div className={styles.accessRow}>
                <span className={styles.accessBadge}>
                  {accessBadgeText}
                </span>
                {accessStatus.checkedAddress && (
                  <span className={styles.accessMeta}>当前身份: {formatAddress(accessStatus.checkedAddress)}</span>
                )}
                {signingWalletMismatch && address && (
                  <span className={styles.accessMeta}>签名钱包: {formatAddress(address)}</span>
                )}
                {accessStatus.creator && (
                  <span className={styles.accessMeta}>Creator: {accessStatus.creator.slice(0, 8)}...{accessStatus.creator.slice(-6)}</span>
                )}
                {accessStatus.ownedBalance !== null && (
                  <span className={styles.accessMeta}>Balance: {accessStatus.ownedBalance}</span>
                )}
                {accessStatus.payoutReceiver && (
                  <span className={styles.accessMeta}>Splitter: {accessStatus.payoutReceiver.slice(0, 8)}...{accessStatus.payoutReceiver.slice(-6)}</span>
                )}
              </div>
            )}
            {libraryMessage && <div className={styles.notice}>{libraryMessage}</div>}
            {accessError && <div className={styles.error}>链上状态同步失败: {accessError}</div>}
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.item}>
            <div className={styles.label}>价格</div>
            <div className={styles.value}>{formatPrice(info?.priceEth ?? null)}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>访问模式</div>
            <div className={styles.value}>{info?.accessModel || '-'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>预览秒数</div>
            <div className={styles.value}>{info?.previewSeconds ?? '-'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>访问凭证余额</div>
            <div className={styles.value}>{accessStatus.ownedBalance ?? '-'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>Token ID</div>
            <div className={styles.value}>{info?.tokenId ?? '-'}</div>
          </div>
          <div className={styles.item}>
            <div className={styles.label}>Chain ID</div>
            <div className={styles.value}>{info?.chainId ?? '-'}</div>
          </div>
          <div className={`${styles.item} ${styles.full}`}>
            <div className={styles.label}>资源键</div>
            <div className={styles.valueBreak}>{info?.resourceKey || track.platform_unique_id}</div>
          </div>
          <div className={`${styles.item} ${styles.full}`}>
            <div className={styles.label}>合约地址</div>
            <div className={styles.valueBreak}>{info?.contractAddress ?? '-'}</div>
          </div>
          <div className={`${styles.item} ${styles.full}`}>
            <div className={styles.label}>Metadata CID</div>
            <div className={styles.valueBreak}>{info?.metadataCid ?? '-'}</div>
          </div>
        </section>

        {loading && <div className={styles.loading}>正在刷新链上资源详情...</div>}
        {!loading && error && <div className={styles.error}>详情加载失败: {error}</div>}
      </div>
    </ViewShell>
  );
}
