import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import { formatBytes, metadataUriForRelease } from '../../workshopHelpers';
import styles from '../../MusicWorkshop.module.css';

type StoragePanelProps = {
  controller: MusicWorkshopController;
};

export default function StoragePanel({ controller }: StoragePanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;
  const metadataInvalid = !!controller.audioFile
    && !!controller.audioMetadataValidation
    && !controller.audioMetadataValidation.ok;

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
            <button className={styles.primaryButton} onClick={() => void controller.handleUploadAssets()} disabled={!controller.selectedRelease || !controller.web25Session || (!controller.audioFile && !release.audioStorageObjectId) || metadataInvalid || controller.busyState !== 'idle'}>上传素材</button>
            <button className={styles.primaryButton} onClick={() => void controller.handleUploadMetadata()} disabled={!release.audioStorageObjectId || !controller.metadataDocument || controller.busyState !== 'idle'}>上传 Metadata</button>
          </div>
          {metadataInvalid ? (
            <div className={styles.noticeList}>
              {controller.audioMetadataValidation?.issues.map((issue) => (
                <div key={issue.field} className={styles.noticeWarning}>{issue.message}</div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>已上传内容</div>
        <div className={styles.formGrid}>
          <div className={styles.assetBox}>
            <div className={styles.assetTitle}>音频预览</div>
            {release.audioStorageObject ? (
              <>
                <audio controls className={styles.uploadedAudio} src={release.audioStorageObject.gatewayUrl} />
                <div className={styles.assetMetaRow}>
                  <span>{release.audioStorageObject.name}</span>
                  <span>{formatBytes(release.audioStorageObject.size)}</span>
                </div>
                <div className={`${styles.statusValue} ${styles.monospace}`}>{release.audioStorageObject.cid}</div>
              </>
            ) : (
              <div className={styles.assetPlaceholder}>音频上传后可在这里试听。</div>
            )}
          </div>
          <div className={styles.assetBox}>
            <div className={styles.assetTitle}>封面预览</div>
            {release.coverStorageObject ? (
              <>
                <img className={styles.coverPreview} src={release.coverStorageObject.gatewayUrl} alt="已上传封面" />
                <div className={styles.assetMetaRow}>
                  <span>{release.coverStorageObject.name}</span>
                  <span>{formatBytes(release.coverStorageObject.size)}</span>
                </div>
              </>
            ) : (
              <div className={styles.assetPlaceholder}>封面上传后可在这里查看。</div>
            )}
          </div>
          <div className={styles.assetBox}>
            <div className={styles.assetTitle}>Metadata 文件</div>
            {release.metadataStorageObject ? (
              <>
                <a className={styles.uploadedLink} href={release.metadataStorageObject.gatewayUrl} target="_blank" rel="noreferrer">打开 metadata JSON</a>
                <div className={styles.assetMetaRow}>
                  <span>{release.metadataStorageObject.name}</span>
                  <span>{metadataUriForRelease(release)}</span>
                </div>
              </>
            ) : (
              <div className={styles.assetPlaceholder}>Metadata 上传后可在这里打开。</div>
            )}
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
