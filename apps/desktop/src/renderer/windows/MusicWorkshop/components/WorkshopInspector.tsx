import React from 'react';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import { formatRelativeTime, metadataUriForRelease, releaseStatusTone } from '../workshopHelpers';
import { statusToneClass } from './statusTone';
import styles from '../MusicWorkshop.module.css';

type WorkshopInspectorProps = {
  controller: MusicWorkshopController;
};

export default function WorkshopInspector({ controller }: WorkshopInspectorProps) {
  const release = controller.selectedRelease;

  return (
    <aside className={styles.inspector}>
      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>恢复检查</div>
        {release ? (
          <div className={styles.noticeList}>
            <div className={styles.noticeInfo}>{release.statusMessage || '等待下一步操作'}</div>
            {release.latestError && <div className={styles.noticeDanger}>{release.latestError}</div>}
            {controller.needsAudioReattach && <div className={styles.noticeWarning}>音频文件已脱离本地内存，需要重新挂载。</div>}
            {controller.needsCoverReattach && <div className={styles.noticeWarning}>封面文件已脱离本地内存，需要重新挂载。</div>}
          </div>
        ) : <div className={styles.emptyBody}>选择项目后查看恢复信息。</div>}
      </section>

      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>产物索引</div>
        {release ? (
          <div className={styles.statusList}>
            <div className={styles.statusItem}><div className={styles.statusTitle}>Audio CID</div><div className={`${styles.statusValue} ${styles.monospace}`}>{release.audioStorageObject?.cid || 'pending'}</div></div>
            <div className={styles.statusItem}><div className={styles.statusTitle}>Metadata URI</div><div className={`${styles.statusValue} ${styles.monospace}`}>{metadataUriForRelease(release) || 'ipfs://pending'}</div></div>
            <div className={styles.statusItem}><div className={styles.statusTitle}>Token / Splitter</div><div className={`${styles.statusValue} ${styles.monospace}`}>Token #{release.tokenId || 'pending'}{'\n'}{release.splitterAddress || 'splitter pending'}</div></div>
            <div className={styles.statusItem}><div className={styles.statusTitle}>Publish / Purchase Tx</div><div className={`${styles.statusValue} ${styles.monospace}`}>{release.publishTxHash || 'publish pending'}{'\n'}{release.purchaseTxHash || 'purchase pending'}</div></div>
          </div>
        ) : <div className={styles.emptyBody}>暂无项目。</div>}
      </section>

      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>活动日志</div>
        {release ? (
          <div className={styles.logList}>
            {(release.activityLog.length ? release.activityLog : [{ message: release.statusMessage || '等待活动', level: 'info' as const, at: release.updatedAt }]).map((entry) => (
              <div key={`${entry.at}-${entry.message}`} className={styles.logItem}>
                <div className={styles.logMeta}>
                  <span className={`${styles.statusBadge} ${statusToneClass(entry.level === 'error' ? 'danger' : entry.level === 'success' ? 'success' : releaseStatusTone(release.status), styles)}`}>
                    {entry.level}
                  </span>
                  <span>{formatRelativeTime(entry.at)}</span>
                </div>
                <div className={styles.logMessage}>{entry.message}</div>
              </div>
            ))}
          </div>
        ) : <div className={styles.emptyBody}>暂无日志。</div>}
      </section>
    </aside>
  );
}
