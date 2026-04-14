import React from 'react';
import type {
  EditableTrackMetadata,
  MetadataWriteRequest,
} from '@src/shared/metadata/metadataEditor';
import styles from './MetadataEditor.module.css';

type StatusTone = 'idle' | 'ok' | 'error';

function emptyMetadata(filePath = ''): EditableTrackMetadata {
  return {
    filePath,
    title: '',
    artist: '',
    album: '',
    genre: '',
    year: null,
    lyrics: '',
    coverDataUrl: '',
    durationSec: null,
    bitrate: null,
    sampleRate: null,
    channels: null,
    codec: '',
    container: '',
  };
}

interface MetadataEditorProps {
  embedded?: boolean;
}

export default function MetadataEditor({ embedded = false }: MetadataEditorProps) {
  const [metadata, setMetadata] = React.useState<EditableTrackMetadata>(emptyMetadata());
  const [busy, setBusy] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [statusTone, setStatusTone] = React.useState<StatusTone>('idle');

  const applyMetadata = React.useCallback((next: EditableTrackMetadata) => {
    setMetadata(next);
    setStatus(`已加载 ${next.filePath}`);
    setStatusTone('idle');
  }, []);

  const handleSelectAudio = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const filePath = (file as File & { path?: string }).path;
    if (!filePath) {
      setStatus('未读取到文件路径，请重试。');
      setStatusTone('error');
      return;
    }

    setBusy(true);
    try {
      const result = await window.mainApi.creatorsWorkshopApi.readMetadata(filePath);
      applyMetadata(result);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '读取元数据失败');
      setStatusTone('error');
    } finally {
      setBusy(false);
    }
  }, [applyMetadata]);

  const handleSelectCover = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setMetadata((prev) => ({ ...prev, coverDataUrl: dataUrl }));
      setStatus(`已加载封面 ${file.name}`);
      setStatusTone('idle');
    };
    reader.onerror = () => {
      setStatus('读取封面失败');
      setStatusTone('error');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleField = React.useCallback(<K extends keyof EditableTrackMetadata>(key: K, value: EditableTrackMetadata[K]) => {
    setMetadata((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleWrite = React.useCallback(async () => {
    if (!metadata.filePath) {
      setStatus('请先选择音频文件。');
      setStatusTone('error');
      return;
    }

    const payload: MetadataWriteRequest = {
      filePath: metadata.filePath,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      genre: metadata.genre,
      year: metadata.year,
      lyrics: metadata.lyrics,
      coverDataUrl: metadata.coverDataUrl,
    };

    setBusy(true);
    try {
      const result = await window.mainApi.creatorsWorkshopApi.writeMetadata(payload);
      setStatus(result.message);
      setStatusTone(result.ok ? 'ok' : 'error');
      if (result.ok) {
        const refreshed = await window.mainApi.creatorsWorkshopApi.readMetadata(metadata.filePath);
        setMetadata(refreshed);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '写入失败');
      setStatusTone('error');
    } finally {
      setBusy(false);
    }
  }, [metadata]);

  const statusClassName = statusTone === 'ok'
    ? `${styles.status} ${styles.statusOk}`
    : statusTone === 'error'
      ? `${styles.status} ${styles.statusError}`
      : styles.status;
  const rootClassName = embedded ? `${styles.root} ${styles.embeddedRoot}` : styles.root;

  return (
    <div className={rootClassName}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Metadata Editor</h1>
          <p className={styles.sub}>标准：MP3 ID3v2.3（支持标题、歌手、专辑、流派、年份、歌词、封面）</p>
        </div>
        <div className={styles.actions}>
          <label className={styles.btn}>
            选择音频
            <input hidden type="file" accept=".mp3,audio/mpeg" onChange={handleSelectAudio} />
          </label>
          <button className={styles.primaryBtn} onClick={() => void handleWrite()} disabled={busy || !metadata.filePath}>
            {busy ? '处理中...' : '保存到文件'}
          </button>
        </div>
      </header>

      {status ? <div className={statusClassName}>{status}</div> : null}

      <div className={styles.body}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>基础信息</h2>
          <div className={styles.form}>
            <label className={styles.label}>
              音频文件
              <input className={styles.input} value={metadata.filePath} readOnly />
            </label>
            <div className={styles.row2}>
              <label className={styles.label}>
                标题
                <input className={styles.input} value={metadata.title} onChange={(e) => handleField('title', e.target.value)} />
              </label>
              <label className={styles.label}>
                歌手
                <input className={styles.input} value={metadata.artist} onChange={(e) => handleField('artist', e.target.value)} />
              </label>
            </div>
            <div className={styles.row2}>
              <label className={styles.label}>
                专辑
                <input className={styles.input} value={metadata.album} onChange={(e) => handleField('album', e.target.value)} />
              </label>
              <label className={styles.label}>
                流派
                <input className={styles.input} value={metadata.genre} onChange={(e) => handleField('genre', e.target.value)} />
              </label>
            </div>
            <div className={styles.row2}>
              <label className={styles.label}>
                年份
                <input
                  className={styles.input}
                  type="number"
                  value={metadata.year ?? ''}
                  onChange={(e) => handleField('year', e.target.value ? Number(e.target.value) : null)}
                />
              </label>
              <div className={styles.label}>
                <span>封面</span>
                <label className={styles.btn}>
                  选择封面
                  <input hidden type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={handleSelectCover} />
                </label>
              </div>
            </div>
            <label className={styles.label}>
              歌词（USLT）
              <textarea
                className={styles.textarea}
                value={metadata.lyrics}
                onChange={(e) => handleField('lyrics', e.target.value)}
                placeholder="可粘贴纯文本歌词"
              />
            </label>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>封面与编码信息</h2>
          <div className={styles.coverBox}>
            {metadata.coverDataUrl
              ? <img className={styles.coverPreview} src={metadata.coverDataUrl} alt="cover preview" />
              : <div className={styles.emptyCover}>暂无封面</div>}
            <button className={styles.btn} onClick={() => handleField('coverDataUrl', '')} disabled={!metadata.coverDataUrl}>
              清空封面
            </button>
          </div>
          <ul className={styles.metaList}>
            <li className={styles.metaItem}><span>容器</span><code>{metadata.container || '-'}</code></li>
            <li className={styles.metaItem}><span>编码</span><code>{metadata.codec || '-'}</code></li>
            <li className={styles.metaItem}><span>时长</span><code>{metadata.durationSec ?? '-'} s</code></li>
            <li className={styles.metaItem}><span>比特率</span><code>{metadata.bitrate ?? '-'} bps</code></li>
            <li className={styles.metaItem}><span>采样率</span><code>{metadata.sampleRate ?? '-'} Hz</code></li>
            <li className={styles.metaItem}><span>声道</span><code>{metadata.channels ?? '-'}</code></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
