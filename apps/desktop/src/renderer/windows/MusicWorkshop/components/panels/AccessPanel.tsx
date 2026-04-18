import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import styles from '../../MusicWorkshop.module.css';

type AccessPanelProps = {
  controller: MusicWorkshopController;
};

export default function AccessPanel({ controller }: AccessPanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>授权验证</div>
        <div className={styles.formGrid}>
           <label className={styles.label}>Token ID<input className={styles.input}
                                                         value={controller.accessCheck.tokenId || release.tokenId || ''}
                                                         onChange={(e) => controller.setAccessCheck((prev) => ({
                                                           ...prev,
                                                           tokenId: e.target.value,
                                                         }))} /></label>
          <div className={styles.actionRow}>
            <button className={styles.ghostButton} onClick={controller.useCurrentToken}>使用当前 Token</button>
            <button className={styles.primaryButton} onClick={() => void controller.handleRefreshAccess()}
                    disabled={controller.busyState !== 'idle' || !release.tokenId}>查询授权
            </button>
            <button className={styles.primaryButton} onClick={() => void controller.handleBuyAccess()}
                    disabled={controller.busyState !== 'idle' || !release.tokenId}>购买访问权
            </button>
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>当前授权</div>
              <div className={styles.infoBody}>Token #{controller.accessCheck.tokenId || 'pending'}{'\n'}Requires
                purchase: {String(controller.accessCheck.requiresPurchase)}{'\n'}Active: {String(controller.accessCheck.active)}{'\n'}Has
                access: {String(controller.accessCheck.hasAccess)}{'\n'}ERC-1155
                balance: {controller.accessCheck.ownedBalance || '0'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>价格与分账</div>
              <div className={styles.infoBody}>Price: {controller.accessCheck.priceEth || 'pending'} ETH{'\n'}Platform
                fee: {controller.accessCheck.platformFeeEth || 'pending'} ETH{'\n'}Creator
                proceeds: {controller.accessCheck.creatorProceedsEth || 'pending'} ETH
              </div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>链上地址</div>
              <div
                className={styles.infoBody}>Creator: {controller.accessCheck.creator || 'pending'}{'\n'}Splitter: {controller.accessCheck.payoutReceiver || 'pending'}</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>边界说明</div>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>服务器</div>
            <div className={styles.infoBody}>记录草稿、上传状态、失败原因、已发布列表与恢复上下文。</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>IPFS</div>
            <div className={styles.infoBody}>保存 metadata、封面和音频等内容寻址对象。</div>
          </div>
          <div className={styles.infoCard}>
            <div className={styles.infoLabel}>链上</div>
            <div className={styles.infoBody}>保存 tokenURI、授权规则、价格和分账接收方。</div>
          </div>
        </div>
      </section>
    </div>
  );
}
