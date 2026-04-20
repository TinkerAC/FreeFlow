import React from 'react';
import type { CreatorReleaseRecord } from '@renderer/core/web25/client';
import WorkshopTopBar from './components/WorkshopTopBar';
import WorkshopSidebar from './components/WorkshopSidebar';
import MetadataEditorPanel from './components/panels/MetadataEditorPanel';
import PublishWorkspace from './components/panels/PublishWorkspace';
import RoyaltyEarningsPanel from './components/panels/RoyaltyEarningsPanel';
import { useMusicWorkshopController } from './hooks/useMusicWorkshopController';
import {
  type PublishSection,
  normalizeReleasePanel,
  type ReleasePanel,
  type WorkshopSection,
  WORKSHOP_NAV_ITEMS,
} from './workshopHelpers';
import styles from './MusicWorkshop.module.css';
import './MusicWorkshop.css';

const SECTION_COPY: Record<WorkshopSection, { title: string; subtitle: string }> = {
  publish: {
    title: '发布作品',
    subtitle: '管理草稿、上传素材并完成链上发布。',
  },
  metadata: {
    title: '元数据编辑',
    subtitle: '按标准编辑标题、流派、歌词与封面，便于客户端展示。',
  },
  royalties: {
    title: '收益中心',
    subtitle: '查看分账合约收益、领取余额，并跟踪历史收入。',
  },
};

export default function CreatorsWorkshop() {
  const controller = useMusicWorkshopController();
  const [activeSection, setActiveSection] = React.useState<WorkshopSection>('publish');
  const [activePublishSection, setActivePublishSection] = React.useState<PublishSection>('editor');

  React.useEffect(() => {
    if (activeSection !== 'publish') return;
    if (activePublishSection === 'activity') return;
    if (controller.activePanel !== activePublishSection) {
      setActivePublishSection(controller.activePanel);
    }
  }, [activePublishSection, activeSection, controller.activePanel]);

  const selectSection = React.useCallback((section: WorkshopSection) => {
    setActiveSection(section);
    if (section === 'metadata') {
      return;
    }
    if (activePublishSection !== 'activity') {
      controller.setActivePanel(activePublishSection as ReleasePanel);
    }
  }, [activePublishSection, controller]);

  const selectPublishSection = React.useCallback((section: PublishSection) => {
    setActiveSection('publish');
    setActivePublishSection(section);
    if (section !== 'activity') {
      controller.setActivePanel(section);
      controller.updateLocalRelease({ currentStage: section });
    }
  }, [controller]);

  const openRelease = React.useCallback((release: CreatorReleaseRecord, section?: ReleasePanel) => {
    const nextSection = section ?? normalizeReleasePanel(release.currentStage);
    controller.handleSelectRelease(release);
    controller.setActivePanel(nextSection);
    setActiveSection('publish');
    setActivePublishSection(nextSection);
  }, [controller]);

  const createRelease = React.useCallback(async () => {
    if (!controller.web25Session) return;
    await controller.handleCreateRelease();
    controller.setActivePanel('editor');
    setActiveSection('publish');
    setActivePublishSection('editor');
  }, [controller]);

  const sectionMeta = SECTION_COPY[activeSection];
  const activeNavItem = WORKSHOP_NAV_ITEMS.find((item) => item.value === activeSection);

  const content = React.useMemo(() => {
    if (activeSection === 'metadata' || activeSection === 'royalties') {
      return (
        <>
          <div className={styles.contentHeader}>
            <div className={styles.contentTitleBlock}>
              <div className={styles.contentEyebrow}>{activeNavItem?.label || sectionMeta.title}</div>
              <h1 className={styles.contentTitle}>{sectionMeta.title}</h1>
              <p className={styles.contentSubtitle}>{sectionMeta.subtitle}</p>
            </div>
          </div>
          <div className={styles.contentBody}>
            {activeSection === 'metadata' ? <MetadataEditorPanel /> : <RoyaltyEarningsPanel controller={controller} />}
          </div>
        </>
      );
    }

    return (
      <PublishWorkspace
        controller={controller}
        activePublishSection={activePublishSection}
        onSelectPublishSection={selectPublishSection}
        onSelectRelease={openRelease}
        onCreateRelease={createRelease}
      />
    );
  }, [
    activeNavItem?.label,
    activePublishSection,
    activeSection,
    controller,
    createRelease,
    openRelease,
    sectionMeta.subtitle,
    sectionMeta.title,
    selectPublishSection,
  ]);

  return (
    <div className={styles.window}>
      <div className={styles.adminShell}>
        <WorkshopTopBar
          controller={controller}
          activeSection={activeSection}
        />

        <div className={styles.adminBody}>
          <WorkshopSidebar
            activeSection={activeSection}
            onSelectSection={selectSection}
          />

          <main className={styles.contentShell}>{content}</main>
        </div>
      </div>
    </div>
  );
}
