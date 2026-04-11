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

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>链上配置</div>
        <div className={styles.formGrid}>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>链名称<input className={styles.input} value={controller.web3Settings?.chainName || controller.effectiveWeb3Settings.chainName} onChange={(e) => controller.setByPath('services.web3Publishing.chainName', e.target.value)} /></label>
            <label className={styles.label}>Chain ID<input className={styles.input} type="number" value={controller.web3Settings?.chainId || controller.effectiveWeb3Settings.chainId} onChange={(e) => controller.setByPath('services.web3Publishing.chainId', Number(e.target.value) || controller.effectiveWeb3Settings.chainId)} /></label>
          </div>
          <label className={styles.label}>Explorer URL<input className={styles.input} value={controller.web3Settings?.explorerUrl || controller.effectiveWeb3Settings.explorerUrl} onChange={(e) => controller.setByPath('services.web3Publishing.explorerUrl', e.target.value)} /></label>
          <label className={styles.label}>MusicAsset<input className={styles.input} value={controller.web3Settings?.musicAssetAddress || controller.effectiveWeb3Settings.musicAssetAddress} onChange={(e) => controller.setByPath('services.web3Publishing.musicAssetAddress', e.target.value)} /></label>
          <label className={styles.label}>RoyaltySplitterFactory<input className={styles.input} value={controller.web3Settings?.royaltySplitterFactoryAddress || controller.effectiveWeb3Settings.royaltySplitterFactoryAddress} onChange={(e) => controller.setByPath('services.web3Publishing.royaltySplitterFactoryAddress', e.target.value)} /></label>
          <label className={styles.label}>PlatformHub<input className={styles.input} value={controller.web3Settings?.platformHubAddress || controller.effectiveWeb3Settings.platformHubAddress} onChange={(e) => controller.setByPath('services.web3Publishing.platformHubAddress', e.target.value)} /></label>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={() => void controller.handlePublish()} disabled={!metadataUriForRelease(release) || !controller.effectiveWeb3Settings.platformHubAddress || controller.busyState !== 'idle'}>发布到链上</button>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>分账列表</div>
        <div className={styles.splitList}>
          {controller.activeSplits.map((item, index) => (
            <div key={item.id} className={styles.splitRow}>
              <input className={styles.input} value={item.address} onChange={(e) => controller.updateSplitAt(index, { address: e.target.value })} placeholder={`${item.label} wallet address`} />
              <input className={styles.input} type="number" min={0} max={100} value={item.share} onChange={(e) => controller.updateSplitAt(index, { share: Number(e.target.value) || 0 })} />
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
