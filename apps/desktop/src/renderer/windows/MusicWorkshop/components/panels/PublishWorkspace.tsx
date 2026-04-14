import React from 'react';
import type { CreatorReleaseRecord } from '@renderer/core/web25/client';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import EditorPanel from './EditorPanel';
import StoragePanel from './StoragePanel';
import PublishPanel from './PublishPanel';
import AccessPanel from './AccessPanel';
import ActivityPanel from './ActivityPanel';
import {
  formatRelativeTime,
  PUBLISH_SECTION_ITEMS,
  RELEASE_FILTERS,
  releaseStatusLabel,
  releaseStatusTone,
  type PublishSection,
  type ReleasePanel,
} from '../../workshopHelpers';
import { statusToneClass } from '../statusTone';
import styles from '../../MusicWorkshop.module.css';

type PublishWorkspaceProps = {
  controller: MusicWorkshopController;
  activePublishSection: PublishSection;
  onSelectPublishSection: (section: PublishSection) => void;
  onSelectRelease: (release: CreatorReleaseRecord, section?: ReleasePanel) => void;
  onCreateRelease: () => void | Promise<void>;
};

function EmptyPublishState() {
  return (
    <section className={styles.emptyWorkspace}>
      <div className={styles.emptyTitle}>请选择项目</div>
      <div className={styles.emptyBody}>在项目管理中选择作品，或登录 SIWE 会话后创建新项目。</div>
    </section>
  );
}

function renderStep(controller: MusicWorkshopController, section: PublishSection) {
  if (!controller.selectedRelease) return <EmptyPublishState />;

  switch (section) {
    case 'editor':
      return <EditorPanel controller={controller} />;
    case 'storage':
      return <StoragePanel controller={controller} />;
    case 'publish':
      return <PublishPanel controller={controller} />;
    case 'access':
      return <AccessPanel controller={controller} />;
    case 'activity':
      return <ActivityPanel controller={controller} />;
    default:
      return <EmptyPublishState />;
  }
}

export default function PublishWorkspace({
  controller,
  activePublishSection,
  onSelectPublishSection,
  onSelectRelease,
  onCreateRelease,
}: PublishWorkspaceProps) {
  const release = controller.selectedRelease;
  const activeItem = PUBLISH_SECTION_ITEMS.find((item) => item.value === activePublishSection);

  return (
    <div className={styles.publishWorkspace}>
      <header className={styles.publishTopbar}>
        <div className={styles.publishStepInfo}>
          <div className={styles.contentEyebrow}>发布作品</div>
          <h1 className={styles.contentTitle}>{activeItem?.label || '项目资料'}</h1>
          <p className={styles.contentSubtitle}>{activeItem?.description || '完善项目并继续发布流程。'}</p>
        </div>

        <nav className={styles.publishFlowNav} aria-label="发布流程">
          {PUBLISH_SECTION_ITEMS.map((item) => (
            <button
              key={item.value}
              className={`${styles.panelTab} ${activePublishSection === item.value ? styles.panelTabActive : ''}`}
              onClick={() => onSelectPublishSection(item.value)}
              disabled={!release}
              title={item.description}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.publishStatusStrip}>
          {release ? (
            <>
              <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(release.status), styles)}`}>
                {releaseStatusLabel(release.status)}
              </span>
              <span className={styles.statusPill}>{release.tokenId ? `Token #${release.tokenId}` : '未上链'}</span>
              <span className={styles.statusPill}>{release.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
            </>
          ) : (
            <span className={styles.statusPill}>未选择项目</span>
          )}
        </div>
      </header>

      <div className={styles.publishBody}>
        <aside className={styles.projectManager}>
          <div className={styles.projectManagerHeader}>
            <div>
              <div className={styles.sideSectionTitle}>项目管理</div>
              <div className={styles.navHint}>{controller.visibleReleases.length} 个项目</div>
            </div>
            <button
              className={styles.primaryButton}
              onClick={() => void onCreateRelease()}
              disabled={!controller.web25Session}
            >
              新建
            </button>
          </div>

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

          <button
            className={styles.ghostButton}
            onClick={() => void controller.refreshDashboard(controller.selectedRelease?.id)}
            disabled={!controller.web25Session || controller.busyState !== 'idle'}
          >
            刷新项目
          </button>

          {!controller.web25Session && <div className={styles.emptyBody}>登录后管理草稿、素材和发布记录。</div>}

          <div className={styles.releaseList}>
            {controller.visibleReleases.map((item) => (
              <button
                key={item.id}
                className={`${styles.releaseCard} ${release?.id === item.id ? styles.releaseCardActive : ''}`}
                onClick={() => onSelectRelease(item)}
              >
                <div className={styles.releaseCardTop}>
                  <div className={styles.releaseTitle}>{item.title || 'Untitled Draft'}</div>
                  <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(item.status), styles)}`}>
                    {releaseStatusLabel(item.status)}
                  </span>
                </div>
                <div className={styles.releaseMeta}>
                  <span>{item.artistName || 'Unknown artist'}</span>
                  <span>{formatRelativeTime(item.updatedAt)}</span>
                </div>
                <div className={styles.releaseMeta}>
                  <span>{item.tokenId ? `Token #${item.tokenId}` : '未上链'}</span>
                  <span>{item.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.publishPanel}>
          {renderStep(controller, activePublishSection)}
        </section>
      </div>
    </div>
  );
}
