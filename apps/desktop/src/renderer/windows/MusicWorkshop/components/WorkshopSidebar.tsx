import React from 'react';
import type { CreatorReleaseRecord } from '@renderer/core/web25/client';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import {
  formatRelativeTime,
  RELEASE_FILTERS,
  releaseStatusLabel,
  releaseStatusTone,
  type WorkshopSection,
  WORKSHOP_NAV_ITEMS,
} from '../workshopHelpers';
import { statusToneClass } from './statusTone';
import styles from '../MusicWorkshop.module.css';

type WorkshopSidebarProps = {
  controller: MusicWorkshopController;
  activeSection: WorkshopSection;
  onSelectSection: (section: WorkshopSection) => void;
  onSelectRelease: (release: CreatorReleaseRecord) => void;
};

export default function WorkshopSidebar({
  controller,
  activeSection,
  onSelectSection,
  onSelectRelease,
}: WorkshopSidebarProps) {
  return (
    <aside className={styles.sideNav}>
      <section className={styles.sideSection}>
        <div className={styles.sideSectionTitle}>业务菜单</div>
        <div className={styles.navList}>
          {WORKSHOP_NAV_ITEMS.map((item) => {
            const disabled = item.requiresRelease && !controller.selectedRelease;
            return (
              <button
                key={item.value}
                className={`${styles.navButton} ${activeSection === item.value ? styles.navButtonActive : ''}`}
                onClick={() => onSelectSection(item.value)}
                disabled={disabled}
              >
                <span className={styles.navLabel}>{item.label}</span>
                <span className={styles.navHint}>{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.sideSection}>
        <div className={styles.sideSectionTitle}>项目筛选</div>
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

      <section className={`${styles.sideSection} ${styles.releaseSection}`}>
        <div className={styles.sideSectionHeader}>
          <div className={styles.sideSectionTitle}>项目列表</div>
          <span className={styles.sideCount}>{controller.visibleReleases.length}</span>
        </div>

        {!controller.web25Session && <div className={styles.emptyBody}>登录后管理草稿、素材和发布记录。</div>}

        <div className={styles.releaseList}>
          {controller.visibleReleases.map((release) => (
            <button
              key={release.id}
              className={`${styles.releaseCard} ${controller.selectedRelease?.id === release.id ? styles.releaseCardActive : ''}`}
              onClick={() => onSelectRelease(release)}
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
                <span>{release.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}
