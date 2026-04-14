import React from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { syncOwnedFreeFlowLibrary } from '@renderer/core/freeflow/ownedLibrary';
import { resolveIndexedTrackResource } from '@renderer/core/web25/client';
import PlayerController from '@renderer/core/controller/PlayerController';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import { FreeFlowTrackInfo, TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { DEFAULT_SEPOLIA_CONTRACTS, MUSIC_ASSET_ABI, PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';
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
    royaltyBps: payload.royaltyBps,
    coverUrl: payload.coverUrl,
    audioUrl: payload.audioUrl,
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

export default function FreeFlowTrackDetailView({ track, player }: FreeFlowTrackDetailViewProps) {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const [info, setInfo] = React.useState<FreeFlowTrackInfo | null>(track.freeflow ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [refreshingAccess, setRefreshingAccess] = React.useState(false);
  const [buying, setBuying] = React.useState(false);
  const [accessError, setAccessError] = React.useState('');
  const [accessStatus, setAccessStatus] = React.useState<{
    hasAccess: boolean | null;
    requiresPurchase: boolean | null;
    active: boolean | null;
    priceEth: string | null;
    payoutReceiver: string | null;
    owner: string | null;
  }>({
    hasAccess: null,
    requiresPurchase: info?.accessModel === 'purchase',
    active: true,
    priceEth: info?.priceEth ?? null,
    payoutReceiver: null,
    owner: null,
  });

  React.useEffect(() => {
    let cancelled = false;

    const nextInfo = track.freeflow ?? null;
    setInfo(nextInfo);
    setError('');

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
      if (address) {
        hasAccess = requiresPurchase ? await platformHub.hasAccess(address, info.tokenId) : true;
      }

      let owner: string | null = null;
      if (info.contractAddress) {
        const musicAsset = new Contract(info.contractAddress, MUSIC_ASSET_ABI, provider);
        owner = await musicAsset.ownerOf(info.tokenId).catch((): null => null);
        if (owner && address && owner.toLowerCase() === address.toLowerCase()) {
          hasAccess = true;
        }
      }

      const nextPriceEth = formatEther(price);
      setAccessStatus({
        hasAccess,
        requiresPurchase,
        active,
        priceEth: nextPriceEth,
        payoutReceiver: typeof payoutReceiver === 'string' ? payoutReceiver : null,
        owner,
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
  }, [address, info, walletProvider]);

  React.useEffect(() => {
    if (!walletProvider || !info?.tokenId) return;
    void refreshAccess();
  }, [info?.platformHubAddress, info?.tokenId, refreshAccess, walletProvider]);

  const handleBuyAccess = React.useCallback(async () => {
    if (!walletProvider || !address || !info?.tokenId) return;

    setBuying(true);
    setAccessError('');
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const hubAddress = info.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress;
      const platformHub = new Contract(hubAddress, PLATFORM_HUB_ABI, signer);
      const [, , price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(info.tokenId);

      if (!active) {
        throw new Error('该资源当前不开放购买');
      }
      if (!requiresPurchase) {
        await refreshAccess();
        return;
      }

      const buyTx = await platformHub.buyAccess(info.tokenId, { value: price });
      await buyTx.wait();

      await syncOwnedFreeFlowLibrary({
        baseUrl: web25BaseUrl.value,
        walletProvider,
        account: address,
      });

      await refreshAccess();
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : String(err ?? ''));
    } finally {
      setBuying(false);
    }
  }, [address, info, refreshAccess, walletProvider, web25BaseUrl.value]);

  const requiresPurchase = accessStatus.requiresPurchase ?? (info?.accessModel === 'purchase');
  const hasAccess = accessStatus.hasAccess;
  const canPlay = !requiresPurchase || !!hasAccess;

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
                    if (!isConnected || !walletProvider || !address) {
                      void open();
                      return;
                    }
                    void handleBuyAccess();
                  }}
                  disabled={buying || refreshingAccess || (!!hasAccess)}
                >
                  {!isConnected || !walletProvider || !address
                    ? '连接钱包'
                    : (hasAccess ? '已拥有访问权' : (buying ? '购买中...' : `购买 ${formatPrice(accessStatus.priceEth ?? info?.priceEth ?? null)}`))}
                </button>
              )}
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
                  {hasAccess ? '已授权' : '未授权'}
                </span>
                {accessStatus.owner && (
                  <span className={styles.accessMeta}>Owner: {accessStatus.owner.slice(0, 8)}...{accessStatus.owner.slice(-6)}</span>
                )}
                {accessStatus.payoutReceiver && (
                  <span className={styles.accessMeta}>Splitter: {accessStatus.payoutReceiver.slice(0, 8)}...{accessStatus.payoutReceiver.slice(-6)}</span>
                )}
              </div>
            )}
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
            <div className={styles.label}>版税(BPS)</div>
            <div className={styles.value}>{info?.royaltyBps ?? '-'}</div>
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
