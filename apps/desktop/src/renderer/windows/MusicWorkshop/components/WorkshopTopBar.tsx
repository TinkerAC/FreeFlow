import React from 'react';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import type { WorkshopSection } from '../workshopHelpers';
import { WORKSHOP_NAV_ITEMS } from '../workshopHelpers';
import styles from '../MusicWorkshop.module.css';

type WorkshopTopBarProps = {
  controller: MusicWorkshopController;
  activeSection: WorkshopSection;
  onCreateRelease: () => void | Promise<void>;
};

function busyLabel(state: MusicWorkshopController['busyState']) {
  switch (state) {
    case 'loading-dashboard':
      return '加载项目';
    case 'uploading-assets':
      return '上传素材';
    case 'uploading-metadata':
      return '上传 Metadata';
    case 'publishing':
      return '链上发布';
    case 'checking-access':
      return '查询授权';
    case 'buying':
      return '购买授权';
    default:
      return '空闲';
  }
}

function autosaveLabel(state: MusicWorkshopController['autosaveState']) {
  switch (state) {
    case 'saving':
      return '保存中';
    case 'saved':
      return '已保存';
    case 'error':
      return '保存失败';
    default:
      return '待编辑';
  }
}

export default function WorkshopTopBar({ controller, activeSection, onCreateRelease }: WorkshopTopBarProps) {
  const activeItem = WORKSHOP_NAV_ITEMS.find((item) => item.value === activeSection);
  const sessionAddress = controller.web25Session?.address;
  const walletLabel = controller.isConnected && controller.address
    ? `钱包 ${controller.address.slice(0, 6)}...`
    : '连接钱包';

  return (
    <header className={styles.topBar}>
      <div className={styles.brandGroup}>
        <div className={styles.brandMark}>CW</div>
        <div className={styles.brandCopy}>
          <div className={styles.topBarTitle}>Creators Workshop</div>
          <div className={styles.topBarSubtitle}>
            {activeItem?.label || '工作台'} / {controller.selectedRelease?.title || '未选择项目'}
          </div>
        </div>
      </div>

      <div className={styles.topBarStatus}>
        <span className={`${styles.statusPill} ${controller.web25Session ? styles.statusPillOnline : styles.statusPillMuted}`}>
          {sessionAddress ? `SIWE ${sessionAddress.slice(0, 6)}...${sessionAddress.slice(-4)}` : 'SIWE 未登录'}
        </span>
        <span className={styles.statusPill}>任务：{busyLabel(controller.busyState)}</span>
        <span className={styles.statusPill}>草稿：{autosaveLabel(controller.autosaveState)}</span>
      </div>

      <div className={styles.topBarActions}>
        <button
          className={styles.ghostButton}
          onClick={() => void controller.refreshDashboard(controller.selectedRelease?.id)}
          disabled={!controller.web25Session || controller.busyState !== 'idle'}
        >
          刷新
        </button>
        <button
          className={styles.primaryButton}
          onClick={() => void onCreateRelease()}
          disabled={!controller.web25Session}
        >
          新建项目
        </button>
        <button
          className={styles.ghostButton}
          onClick={() => (controller.web25Session ? void controller.handleSiweLogout() : void controller.handleSiweLogin())}
          disabled={controller.authBusy}
        >
          {controller.authBusy ? '处理中...' : (controller.web25Session ? '退出会话' : 'SIWE 登录')}
        </button>
        <button className={styles.walletButton} onClick={() => controller.open()}>{walletLabel}</button>
      </div>
    </header>
  );
}
