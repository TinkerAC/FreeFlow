import React from 'react';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import { formatRelativeTime, RELEASE_FILTERS, releaseStatusLabel, releaseStatusTone } from '../workshopHelpers';
import { statusToneClass } from './statusTone';
import styles from '../MusicWorkshop.module.css';

type ReleaseSidebarProps = {
  controller: MusicWorkshopController;
};

export default function ReleaseSidebar({ controller }: ReleaseSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>概览</div>
        <div className={styles.metricGrid}>
          <div className={styles.metricCard}><div className={styles.metricLabel}>项目</div><div className={styles.metricValue}>{controller.dashboard.summary.total}</div></div>
          <div className={styles.metricCard}><div className={styles.metricLabel}>进行中</div><div className={styles.metricValue}>{controller.dashboard.summary.inProgress}</div></div>
          <div className={styles.metricCard}><div className={styles.metricLabel}>已发布</div><div className={styles.metricValue}>{controller.dashboard.summary.published}</div></div>
          <div className={styles.metricCard}><div className={styles.metricLabel}>失败</div><div className={styles.metricValue}>{controller.dashboard.summary.failed}</div></div>
        </div>
      </section>

      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>筛选</div>
        <div className={styles.filterRow}>
          {RELEASE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={`${styles.filterButton} ${controller.releaseFilter === filter.value ? styles.filterButtonActive : ''}`}
              onClick={() => controller.setReleaseFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.sidebarCard}>
        <div className={styles.sectionHeading}>项目列表</div>
        {!controller.web25Session && <div className={styles.emptyBody}>登录后可追踪发布流程和已发布内容。</div>}
        <div className={styles.releaseList}>
          {controller.visibleReleases.map((release) => (
            <button
              key={release.id}
              className={`${styles.releaseCard} ${controller.selectedRelease?.id === release.id ? styles.releaseCardActive : ''}`}
              onClick={() => controller.handleSelectRelease(release)}
            >
              <div className={styles.releaseCardTop}>
                <div className={styles.releaseTitle}>{release.title || 'Untitled Draft'}</div>
                <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(release.status), styles)}`}>
                  {releaseStatusLabel(release.status)}
                </span>
              </div>
              <div className={styles.releaseMeta}>
                <span>{release.artistName || 'Unknown artist'}</span>
                <span>{formatRelativeTime(release.updatedAt)}</span>
              </div>
              <div className={styles.releaseMeta}>
                <span>{release.tokenId ? `Token #${release.tokenId}` : '未上链'}</span>
                <span>{release.metadataCid ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
