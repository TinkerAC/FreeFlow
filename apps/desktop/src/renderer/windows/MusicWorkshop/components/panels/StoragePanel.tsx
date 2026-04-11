import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import { formatBytes } from '../../workshopHelpers';
import styles from '../../MusicWorkshop.module.css';

type StoragePanelProps = {
  controller: MusicWorkshopController;
};

export default function StoragePanel({ controller }: StoragePanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>存储控制台</div>
        <div className={styles.formGrid}>
          <label className={styles.label}>Web2.5 Backend URL<input className={styles.input} value={controller.web25BackendBaseUrl} onChange={(e) => controller.setByPath('services.web25Backend.baseUrl', e.target.value)} /></label>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>Gateway<input className={styles.input} value={controller.pinataConfig?.gatewayBaseUrl || ''} readOnly /></label>
            <label className={styles.label}>Network<input className={styles.input} value={controller.pinataConfig?.network || ''} readOnly /></label>
          </div>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>SIWE 会话<input className={styles.input} value={controller.web25Session ? `${controller.web25Session.address.slice(0, 10)}...` : '未登录'} readOnly /></label>
            <label className={styles.label}>Upload Limit<input className={styles.input} value={controller.pinataConfig ? formatBytes(controller.pinataConfig.maxFileSizeBytes) : ''} readOnly /></label>
          </div>
          <div className={styles.actionRow}>
            <button className={styles.primaryButton} onClick={() => void controller.handleUploadAssets()} disabled={!controller.selectedRelease || !controller.web25Session || (!controller.audioFile && !release.audioCid) || controller.busyState !== 'idle'}>上传素材</button>
            <button className={styles.primaryButton} onClick={() => void controller.handleUploadMetadata()} disabled={!release.audioCid || !controller.metadataDocument || controller.busyState !== 'idle'}>上传 Metadata</button>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>Metadata 预览</div>
        <div className={`${styles.codeBlock} ${styles.monospace}`}>
          {controller.metadataDocument ? JSON.stringify(controller.metadataDocument, null, 2) : '请先完善项目信息并上传音频素材。'}
        </div>
      </section>
    </div>
  );
}
