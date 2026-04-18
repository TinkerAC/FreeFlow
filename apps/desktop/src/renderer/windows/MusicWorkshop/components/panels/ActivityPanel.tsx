import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import { formatRelativeTime, metadataUriForRelease, releaseStatusTone } from '../../workshopHelpers';
import { statusToneClass } from '../statusTone';
import styles from '../../MusicWorkshop.module.css';

type ActivityPanelProps = {
  controller: MusicWorkshopController;
};

type ActivityEntry = {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  at: string;
};

export default function ActivityPanel({ controller }: ActivityPanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;

  const activityLog: ActivityEntry[] = [{ message: release.statusMessage || '等待活动', level: 'info', at: release.updatedAt }];

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>恢复检查</div>
        <div className={styles.noticeList}>
          <div className={styles.noticeInfo}>{release.statusMessage || '等待下一步操作'}</div>
          {release.latestError && <div className={styles.noticeDanger}>{release.latestError}</div>}
          {controller.needsAudioReattach && <div className={styles.noticeWarning}>音频文件已脱离本地内存，需要重新挂载。</div>}
          {controller.needsCoverReattach && <div className={styles.noticeWarning}>封面文件已脱离本地内存，需要重新挂载。</div>}
          {!release.latestError && !controller.needsAudioReattach && !controller.needsCoverReattach && (
            <div className={styles.noticeInfo}>当前项目可以继续下一步。</div>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>产物索引</div>
        <div className={styles.statusList}>
          <div className={styles.statusItem}>
            <div className={styles.statusTitle}>Audio CID</div>
            <div className={`${styles.statusValue} ${styles.monospace}`}>{release.audioStorageObject?.cid || 'pending'}</div>
          </div>
          <div className={styles.statusItem}>
            <div className={styles.statusTitle}>Metadata URI</div>
            <div className={`${styles.statusValue} ${styles.monospace}`}>{metadataUriForRelease(release) || 'ipfs://pending'}</div>
          </div>
          <div className={styles.statusItem}>
            <div className={styles.statusTitle}>Token / Splitter</div>
            <div className={`${styles.statusValue} ${styles.monospace}`}>
              Token #{release.tokenId || 'pending'}{'\n'}{release.splitterAddress || 'splitter pending'}
            </div>
          </div>
          <div className={styles.statusItem}>
            <div className={styles.statusTitle}>Publish Tx</div>
            <div className={`${styles.statusValue} ${styles.monospace}`}>
              {release.publishTxHash || 'publish pending'}
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.card} ${styles.fullSpan}`}>
        <div className={styles.cardTitle}>活动日志</div>
        <div className={styles.logList}>
          {activityLog.map((entry) => (
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
      </section>
    </div>
  );
}
