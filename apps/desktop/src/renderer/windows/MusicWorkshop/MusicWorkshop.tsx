import React from 'react';
import type { CreatorReleaseRecord } from '@renderer/core/web25/client';
import WorkshopTopBar from './components/WorkshopTopBar';
import WorkshopSidebar from './components/WorkshopSidebar';
import DashboardOverview from './components/panels/DashboardOverview';
import EditorPanel from './components/panels/EditorPanel';
import StoragePanel from './components/panels/StoragePanel';
import PublishPanel from './components/panels/PublishPanel';
import AccessPanel from './components/panels/AccessPanel';
import ActivityPanel from './components/panels/ActivityPanel';
import { statusToneClass } from './components/statusTone';
import { useMusicWorkshopController } from './hooks/useMusicWorkshopController';
import {
  isReleasePanel,
  normalizeReleasePanel,
  releaseStatusLabel,
  releaseStatusTone,
  type ReleasePanel,
  type WorkshopSection,
  WORKSHOP_NAV_ITEMS,
} from './workshopHelpers';
import styles from './MusicWorkshop.module.css';
import './MusicWorkshop.css';

const SECTION_COPY: Record<WorkshopSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: '工作台',
    subtitle: '集中查看项目进度、服务状态和最近更新。',
  },
  editor: {
    title: '项目资料',
    subtitle: '维护作品信息、访问规则、定价和本地素材。',
  },
  storage: {
    title: '素材存储',
    subtitle: '上传音频、封面与 Metadata，并核对 IPFS 产物。',
  },
  publish: {
    title: '链上发布',
    subtitle: '确认分账比例，并提交发布交易。',
  },
  access: {
    title: '授权交易',
    subtitle: '查询 Token 授权、支付预览和购买结果。',
  },
  activity: {
    title: '日志与产物',
    subtitle: '查看恢复提醒、CID、交易哈希和活动记录。',
  },
};

function EmptyState() {
  return (
    <section className={styles.emptyWorkspace}>
      <div className={styles.emptyTitle}>请选择项目</div>
      <div className={styles.emptyBody}>在左侧项目列表选择作品，或登录 SIWE 会话后创建新项目。</div>
    </section>
  );
}

export default function MusicWorkshop() {
  const controller = useMusicWorkshopController();
  const [activeSection, setActiveSection] = React.useState<WorkshopSection>('dashboard');

  React.useEffect(() => {
    if (!controller.selectedRelease && activeSection !== 'dashboard') {
      setActiveSection('dashboard');
    }
  }, [activeSection, controller.selectedRelease]);

  React.useEffect(() => {
    if (isReleasePanel(activeSection) && controller.activePanel !== activeSection) {
      setActiveSection(controller.activePanel);
    }
  }, [activeSection, controller.activePanel]);

  const selectSection = React.useCallback((section: WorkshopSection) => {
    setActiveSection(section);
    if (isReleasePanel(section)) {
      controller.setActivePanel(section);
      controller.updateLocalRelease({ currentStage: section });
    }
  }, [controller]);

  const openRelease = React.useCallback((release: CreatorReleaseRecord, section?: ReleasePanel) => {
    const nextSection = section ?? normalizeReleasePanel(release.currentStage);
    controller.handleSelectRelease(release);
    controller.setActivePanel(nextSection);
    setActiveSection(nextSection);
  }, [controller]);

  const createRelease = React.useCallback(async () => {
    if (!controller.web25Session) return;
    await controller.handleCreateRelease();
    controller.setActivePanel('editor');
    setActiveSection('editor');
  }, [controller]);

  const sectionMeta = SECTION_COPY[activeSection];
  const activeNavItem = WORKSHOP_NAV_ITEMS.find((item) => item.value === activeSection);
  const release = controller.selectedRelease;

  const content = React.useMemo(() => {
    if (activeSection !== 'dashboard' && !release) return <EmptyState />;

    switch (activeSection) {
      case 'dashboard':
        return <DashboardOverview controller={controller} onOpenRelease={openRelease} onCreateRelease={createRelease} />;
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
        return <EmptyState />;
    }
  }, [activeSection, controller, createRelease, openRelease, release]);

  return (
    <div className={styles.window}>
      <div className={styles.adminShell}>
        <WorkshopTopBar controller={controller} activeSection={activeSection} onCreateRelease={createRelease} />

        <div className={styles.adminBody}>
          <WorkshopSidebar
            controller={controller}
            activeSection={activeSection}
            onSelectSection={selectSection}
            onSelectRelease={openRelease}
          />

          <main className={styles.contentShell}>
            <div className={styles.contentHeader}>
              <div className={styles.contentTitleBlock}>
                <div className={styles.contentEyebrow}>{activeNavItem?.label || '工作台'}</div>
                <h1 className={styles.contentTitle}>{sectionMeta.title}</h1>
                <p className={styles.contentSubtitle}>{sectionMeta.subtitle}</p>
              </div>

              {release && (
                <div className={styles.contentTools}>
                  <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(release.status), styles)}`}>
                    {releaseStatusLabel(release.status)}
                  </span>
                  <span className={styles.statusPill}>{release.tokenId ? `Token #${release.tokenId}` : '未上链'}</span>
                  <span className={styles.statusPill}>{release.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
                </div>
              )}
            </div>

            <div className={styles.contentBody}>{content}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
