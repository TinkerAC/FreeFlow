import React from 'react';
import type { MusicWorkshopController } from '../../hooks/useMusicWorkshopController';
import { formatBytes, slugify, type AccessModel } from '../../workshopHelpers';
import styles from '../../MusicWorkshop.module.css';

type EditorPanelProps = {
  controller: MusicWorkshopController;
};

export default function EditorPanel({ controller }: EditorPanelProps) {
  const release = controller.selectedRelease;
  if (!release) return null;

  return (
    <div className={styles.panelGrid}>
      <section className={styles.card}>
        <div className={styles.cardTitle}>项目元信息</div>
        <div className={styles.formGrid}>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>标题<input className={styles.input} value={release.title} onChange={(e) => controller.updateLocalRelease({ title: e.target.value, slug: slugify(e.target.value) })} /></label>
            <label className={styles.label}>歌手<input className={styles.input} value={release.artistName || ''} onChange={(e) => controller.updateLocalRelease({ artistName: e.target.value })} /></label>
          </div>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>专辑<input className={styles.input} value={release.albumName || ''} onChange={(e) => controller.updateLocalRelease({ albumName: e.target.value })} /></label>
            <label className={styles.label}>流派<input className={styles.input} value={release.genreLabel || ''} onChange={(e) => controller.updateLocalRelease({ genreLabel: e.target.value })} /></label>
          </div>
          <label className={styles.label}>描述<textarea className={styles.textarea} value={release.description || ''} onChange={(e) => controller.updateLocalRelease({ description: e.target.value })} /></label>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>
              访问模式
              <select className={styles.select} value={release.accessModel} onChange={(e) => controller.updateLocalRelease({ accessModel: e.target.value as AccessModel })}>
                <option value="purchase">购买后完整获取</option>
                <option value="open">公开可访问</option>
              </select>
            </label>
            <label className={styles.label}>试听秒数<input className={styles.input} type="number" value={release.previewSeconds} onChange={(e) => controller.updateLocalRelease({ previewSeconds: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className={styles.formRowTwo}>
            <label className={styles.label}>价格 ETH<input className={styles.input} value={release.priceEth} onChange={(e) => controller.updateLocalRelease({ priceEth: e.target.value })} /></label>
            <label className={styles.label}>版税 BPS<input className={styles.input} type="number" value={release.royaltyBps} onChange={(e) => controller.updateLocalRelease({ royaltyBps: Number(e.target.value) || 0 })} /></label>
          </div>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardTitle}>素材挂载</div>
        <div className={styles.assetBox}>
          <div className={styles.assetHeader}>
            <div>
              <div className={styles.assetTitle}>音频</div>
              <div className={styles.assetHint}>{release.audioSourceName || controller.audioFile?.name || '未选择'}</div>
            </div>
            <label className={styles.primaryButton}>
              选择音频
              <input hidden type="file" accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a" onChange={controller.onAudioSelected} />
            </label>
          </div>
          <div className={styles.assetMetaRow}>
            <span>{controller.audioFile ? formatBytes(controller.audioFile.size) : (release.audioCid ? '已记录上传结果' : '等待挂载')}</span>
            <span>{controller.audioFile?.type || 'audio/*'}</span>
          </div>
        </div>

        <div className={styles.assetBox}>
          <div className={styles.assetHeader}>
            <div>
              <div className={styles.assetTitle}>封面</div>
              <div className={styles.assetHint}>{release.coverSourceName || controller.coverFile?.name || '未选择'}</div>
            </div>
            <label className={styles.ghostButton}>
              选择封面
              <input hidden type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={controller.onCoverSelected} />
            </label>
          </div>
          {controller.coverPreviewUrl ? (
            <img className={styles.coverPreview} src={controller.coverPreviewUrl} alt="cover preview" />
          ) : (
            <div className={styles.assetPlaceholder}>封面会被写入 metadata.image。</div>
          )}
        </div>

        <div className={styles.noticeList}>
          {controller.needsAudioReattach && <div className={styles.noticeWarning}>刷新后音频文件对象丢失，需要重新挂载。</div>}
          {controller.needsCoverReattach && <div className={styles.noticeWarning}>刷新后封面文件对象丢失，需要重新挂载。</div>}
          {!controller.needsAudioReattach && !controller.needsCoverReattach && <div className={styles.noticeInfo}>本地文件状态与服务端记录一致。</div>}
        </div>
      </section>
    </div>
  );
}
