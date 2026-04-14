import React from 'react';
import { DefaultCover } from '@components/static';
import { PlatformIcon } from '@components/PlatformIcon';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { resolveIndexedTrackResource } from '@renderer/core/web25/client';
import PlayerController from '@renderer/core/controller/PlayerController';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import { FreeFlowTrackInfo, TrackEntity } from '@src/shared/domainModel/TrackEntity';
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
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const [info, setInfo] = React.useState<FreeFlowTrackInfo | null>(track.freeflow ?? null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

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
              <button className={styles.primaryButton} onClick={() => player.addTrackToNextAndPlay(track)}>播放</button>
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
