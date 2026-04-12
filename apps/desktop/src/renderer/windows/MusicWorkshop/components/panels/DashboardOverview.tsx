import React from 'react';
import type { CreatorReleaseRecord } from '@renderer/core/web25/client';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import {
  formatRelativeTime,
  metadataUriForRelease,
  normalizeReleasePanel,
  releaseStatusLabel,
  releaseStatusTone,
  type ReleasePanel,
} from '../../workshopHelpers';
import { statusToneClass } from '../statusTone';
import styles from '../../MusicWorkshop.module.css';

type DashboardOverviewProps = {
  controller: MusicWorkshopController;
  onOpenRelease: (release: CreatorReleaseRecord, section: ReleasePanel) => void;
  onCreateRelease: () => void | Promise<void>;
};

function countByStatus(releases: CreatorReleaseRecord[], statuses: CreatorReleaseRecord['status'][]) {
  return releases.filter((release) => statuses.includes(release.status)).length;
}

export default function DashboardOverview({ controller, onOpenRelease, onCreateRelease }: DashboardOverviewProps) {
  const { dashboard } = controller;
  const releases = dashboard.releases;
  const storageReady = releases.filter((release) => release.audioStorageObjectId || release.metadataStorageObjectId).length;
  const tokenized = releases.filter((release) => release.tokenId).length;

  const pipeline = [
    { label: '草稿', value: countByStatus(releases, ['DRAFT']), hint: '资料编辑' },
    { label: '素材', value: countByStatus(releases, ['ASSETS_PENDING', 'ASSETS_UPLOADED']), hint: '上传与入库' },
    { label: 'Metadata', value: countByStatus(releases, ['METADATA_UPLOADED']), hint: '可发布' },
    { label: '链上', value: countByStatus(releases, ['PUBLISHING', 'PUBLISHED']), hint: '交易与 Token' },
  ];

  return (
    <div className={styles.dashboardStack}>
      <section className={styles.metricGridWide}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>全部项目</div>
          <div className={styles.metricValue}>{dashboard.summary.total}</div>
          <div className={styles.metricHint}>草稿与已发布作品</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>进行中</div>
          <div className={styles.metricValue}>{dashboard.summary.inProgress}</div>
          <div className={styles.metricHint}>等待补齐素材或上链</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>素材就绪</div>
          <div className={styles.metricValue}>{storageReady}</div>
          <div className={styles.metricHint}>已有关联存储对象</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>已铸造</div>
          <div className={styles.metricValue}>{tokenized}</div>
          <div className={styles.metricHint}>已有 Token ID</div>
        </div>
      </section>

      <div className={styles.dashboardGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>发布流水线</div>
              <div className={styles.cardSub}>从草稿到授权的业务进度</div>
            </div>
          </div>
          <div className={styles.pipelineGrid}>
            {pipeline.map((item) => (
              <div key={item.label} className={styles.pipelineItem}>
                <div className={styles.pipelineValue}>{item.value}</div>
                <div className={styles.pipelineLabel}>{item.label}</div>
                <div className={styles.pipelineHint}>{item.hint}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>服务状态</div>
              <div className={styles.cardSub}>后台、钱包与存储状态</div>
            </div>
          </div>
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Backend</div>
              <div className={styles.infoBody}>{controller.web25BackendBaseUrl}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Pinata</div>
              <div className={styles.infoBody}>{controller.pinataConfig?.gatewayBaseUrl || '未连接'}</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>部署策略</div>
              <div className={styles.infoBody}>链与合约由服务端统一管理</div>
            </div>
            <div className={styles.infoCard}>
              <div className={styles.infoLabel}>Wallet</div>
              <div className={styles.infoBody}>{controller.address || '未连接钱包'}</div>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <div className={styles.cardTitle}>最近项目</div>
            <div className={styles.cardSub}>按更新时间排序</div>
          </div>
          <div className={styles.actionRow}>
            <button
              className={styles.ghostButton}
              onClick={() => void controller.refreshDashboard(controller.selectedRelease?.id)}
              disabled={!controller.web25Session || controller.busyState !== 'idle'}
            >
              刷新列表
            </button>
            <button className={styles.primaryButton} onClick={() => void onCreateRelease()} disabled={!controller.web25Session}>
              新建项目
            </button>
          </div>
        </div>

        {releases.length ? (
          <div className={styles.tableWrap}>
            <table className={styles.releaseTable}>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>状态</th>
                  <th>存储</th>
                  <th>链上</th>
                  <th>更新</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {releases.slice(0, 10).map((release) => (
                  <tr key={release.id}>
                    <td>
                      <div className={styles.tableTitle}>{release.title || 'Untitled Draft'}</div>
                      <div className={styles.tableSub}>{release.artistName || 'Unknown artist'}</div>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${statusToneClass(releaseStatusTone(release.status), styles)}`}>
                        {releaseStatusLabel(release.status)}
                      </span>
                    </td>
                    <td className={styles.monospace}>{metadataUriForRelease(release) || release.audioStorageObject?.cid || 'pending'}</td>
                    <td>{release.tokenId ? `Token #${release.tokenId}` : '未上链'}</td>
                    <td>{formatRelativeTime(release.updatedAt)}</td>
                    <td>
                      <button className={styles.ghostButton} onClick={() => onOpenRelease(release, normalizeReleasePanel(release.currentStage))}>
                        打开
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.emptyPanel}>
            <div className={styles.emptyTitle}>暂无项目</div>
            <div className={styles.emptyBody}>登录 SIWE 会话后，新建项目并开始发布流程。</div>
          </div>
        )}
      </section>
    </div>
  );
}
