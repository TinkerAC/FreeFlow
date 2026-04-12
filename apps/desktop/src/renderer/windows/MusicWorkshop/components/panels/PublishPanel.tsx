import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import { metadataUriForRelease } from '../../workshopHelpers';
import styles from '../../MusicWorkshop.module.css';

type PublishPanelProps = {
  controller: MusicWorkshopController;
};

export default function PublishPanel({ controller }: PublishPanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;

  const requiresPurchase = release.accessModel === 'purchase';
  const priceNumber = Number(release.priceEth);
  const hasValidPurchasePrice = !requiresPurchase || (Number.isFinite(priceNumber) && priceNumber > 0);
  const publishDisabledReason = !metadataUriForRelease(release)
    ? '需要先上传 Metadata'
    : !controller.effectiveWeb3Settings.platformHubAddress
      ? '后端缺少可用的发布部署配置'
      : !hasValidPurchasePrice
        ? '购买模式需要填写大于 0 的 ETH 价格'
        : controller.busyState !== 'idle'
          ? '当前有任务正在执行'
          : '';

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>发布确认</div>
        <div className={styles.formGrid}>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Metadata URI</div>
              <div className={`${styles.infoBody} ${styles.monospace}`}>{metadataUriForRelease(release) || 'ipfs://pending'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>网络</div>
              <div className={styles.infoBody}>{controller.effectiveWeb3Settings.chainName}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>访问模式</div>
              <div className={styles.infoBody}>{requiresPurchase ? `购买制 (${release.priceEth} ETH)` : '公开访问'}</div>
            </div>
          </div>
          {publishDisabledReason && <div className={styles.noticeWarning}>{publishDisabledReason}</div>}
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={() => void controller.handlePublish()}
                    disabled={!!publishDisabledReason}>发布到链上
            </button>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>分账列表</div>
        <div className={styles.splitList}>
          {controller.activeSplits.map((item, index) => (
            <div key={item.id} className={styles.splitRow}>
              <input className={styles.input} value={item.address}
                     onChange={(e) => controller.updateSplitAt(index, { address: e.target.value })}
                     placeholder={`${item.label} wallet address`} />
              <input className={styles.input} type="number" min={0} max={100} value={item.share}
                     onChange={(e) => controller.updateSplitAt(index, { share: Number(e.target.value) || 0 })} />
              <button className={styles.dangerButton} onClick={() => controller.removeSplit(item.id)}>移除</button>
            </div>
          ))}
          <div className={styles.actionRow}>
            <button className={styles.ghostButton} onClick={controller.addSplit}>添加分账人</button>
          </div>
        </div>
      </section>
    </div>
  );
}
