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

function compactIdentifier(value: string, head = 10, tail = 6) {
  const normalized = value.trim();
  if (!normalized) return normalized;
  if (/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
  }
  if (normalized.length > head + tail + 6 && /^[a-zA-Z0-9:_./-]+$/.test(normalized)) {
    return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`;
  }
  return normalized;
}

function releaseInitials(release: CreatorReleaseRecord) {
  const source = release.title || release.artistName || release.slug || 'FF';
  return source.trim().slice(0, 2).toUpperCase();
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
  const openReleaseFromKeyboard = React.useCallback((event: React.KeyboardEvent, item: CreatorReleaseRecord) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelectRelease(item);
  }, [onSelectRelease]);

  const deleteRelease = React.useCallback((event: React.MouseEvent, item: CreatorReleaseRecord) => {
    event.stopPropagation();
    const label = item.title || item.slug || item.id;
    const confirmed = window.confirm(`删除项目「${label}」？后端记录、发布资源索引和未被其他项目引用的素材记录都会被释放。`);
    if (!confirmed) return;
    void controller.handleDeleteRelease(item.id).catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      window.alert(`删除项目失败：${message}`);
    });
  }, [controller]);

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
              <div
                key={item.id}
                className={`${styles.releaseCard} ${release?.id === item.id ? styles.releaseCardActive : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onSelectRelease(item)}
                onKeyDown={(event) => openReleaseFromKeyboard(event, item)}
              >
                <div className={styles.releaseCardLayout}>
                  <div className={styles.releaseThumb}>
                    {item.coverStorageObject?.gatewayUrl ? (
                      <img src={item.coverStorageObject.gatewayUrl} alt="" />
                    ) : (
                      <span>{releaseInitials(item)}</span>
                    )}
                  </div>

                  <div className={styles.releaseCardContent}>
                    <div className={styles.releaseCardTop}>
                      <div className={styles.releaseTitle} title={item.title || item.slug || 'Untitled Draft'}>
                        {compactIdentifier(item.title || item.slug || 'Untitled Draft', 18, 8)}
                      </div>
                      <div className={styles.releaseCardActions}>
                        <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(item.status), styles)}`}>
                          {releaseStatusLabel(item.status)}
                        </span>
                        <button
                          type="button"
                          className={styles.releaseDeleteButton}
                          onClick={(event) => deleteRelease(event, item)}
                          onKeyDown={(event) => event.stopPropagation()}
                          disabled={!controller.web25Session || controller.busyState !== 'idle'}
                          title="删除项目"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    <div className={styles.releaseMetaGrid}>
                      <span title={item.artistName || 'Unknown artist'}>
                        {compactIdentifier(item.artistName || 'Unknown artist', 16, 6)}
                      </span>
                      <span>{formatRelativeTime(item.updatedAt)}</span>
                      <span title={item.tokenId ? `Token #${item.tokenId}` : '未上链'}>
                        {item.tokenId ? `Token #${compactIdentifier(item.tokenId, 8, 6)}` : '未上链'}
                      </span>
                      <span>{item.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
                    </div>
                  </div>
                </div>
              </div>
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
