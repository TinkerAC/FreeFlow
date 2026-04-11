import React from 'react';
import type { MusicWorkshopController } from '../hooks/useMusicWorkshopController';
import styles from '../MusicWorkshop.module.css';

type WorkshopHeaderProps = {
  controller: MusicWorkshopController;
};

export default function WorkshopHeader({ controller }: WorkshopHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.title}>Creators Workshop</div>
        <div className={styles.subtitle}>
          这是独立创作者后台窗口，不走主内容区的 ViewShell 体系。
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          className={styles.ghostButton}
          onClick={() => void controller.refreshDashboard(controller.selectedRelease?.id)}
          disabled={!controller.web25Session || controller.busyState !== 'idle'}
        >
          刷新
        </button>
        <button
          className={styles.primaryButton}
          onClick={() => void controller.handleCreateRelease()}
          disabled={!controller.web25Session}
        >
          新建项目
        </button>
        <button
          className={styles.ghostButton}
          onClick={() => (controller.web25Session ? void controller.handleSiweLogout() : void controller.handleSiweLogin())}
          disabled={controller.authBusy}
        >
          {controller.authBusy ? '处理中…' : (controller.web25Session ? '退出会话' : 'SIWE 登录')}
        </button>
        <button className={styles.walletButton} onClick={() => controller.open()}>
          {controller.isConnected ? `钱包 ${controller.address?.slice(0, 6)}...` : '连接钱包'}
        </button>
      </div>
    </div>
  );
}
