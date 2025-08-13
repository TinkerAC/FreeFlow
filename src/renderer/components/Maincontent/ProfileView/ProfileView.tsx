import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ProfileView.module.css';
import { configContext, systemContext } from '@renderer/core/electronContextApi';
import { formatStorageUnit } from '@src/utils/fsUtils';
import ViewShell from '@components/Maincontent/ViewShell/ViewShell';

/** 简单 SVG 图标 */
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
  </svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
       aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
       aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

function ProfileView() {
  const [avatarPath, setAvatarPath] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [bbsToken, setBbsToken] = useState<string>('');
  const [bbsSid, setBbsSid] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [diskByteUsage, setDiskByteUsage] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('');
  const [author, setAuthor] = useState<string>('');
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [newScanPath, setNewScanPath] = useState<string>('');

  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchConfig = useCallback(async () => {
    const avatar = await configContext.getConfig<string>('avatar_path');
    setAvatarPath(avatar || '');
    const name = await configContext.getConfig<string>('user_name');
    setUsername(name || '');
    const token = await configContext.getConfig<string>('hifini_cookie.bbs_token');
    setBbsToken(token || '');
    const sid = await configContext.getConfig<string>('hifini_cookie.bbs_sid');
    setBbsSid(sid || '');
    const paths = await configContext.getConfig<string[]>('scan_paths');
    setScanPaths(Array.isArray(paths) ? paths : []);
    const byteUsage = await systemContext.calculateFileCacheDiskUsage();
    setDiskByteUsage(byteUsage || 0);
    const ver = await systemContext.getAppVersion();
    setAppVersion(ver);
    setAuthor('Tinker');
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await configContext.setConfig('avatar_path', avatarPath);
      await configContext.setConfig('user_name', username);
      await configContext.setConfig('hifini_cookie.bbs_token', bbsToken);
      await configContext.setConfig('hifini_cookie.bbs_sid', bbsSid);
      await configContext.setConfig<string[]>('scan_paths', scanPaths);
      setMessage('设置已成功保存！');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      console.error('保存配置失败:', e);
      setMessage('保存失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarPath((file as any).path || '');
  };
  const handleSelectAvatar = () => avatarInputRef.current?.click();

  const handleAddScanPath = () => {
    const p = (newScanPath || '').trim();
    if (!p) return;
    if (scanPaths.includes(p)) {
      setMessage('该扫描路径已存在。');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    setScanPaths([...scanPaths, p]);
    setNewScanPath('');
    setMessage('扫描路径已添加，请记得保存。');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleOpenDirectoryDialog = async () => {
    // const selected = await systemContext.openDirectoryDialog();
    // if (selected) setNewScanPath(selected);
    alert('UnImplemented.');
  };

  const avatarSrc = avatarPath ? `file://${avatarPath}` : 'https://via.placeholder.com/96/374151/FFFFFF?text=Avatar';

  return (
    <ViewShell>
      <div className={styles.root}>
        <div className={styles.container}>
          {/* 顶部 */}
          <header className={styles.header}>
            <h1 className={styles.title}>个人中心</h1>
            <p className={styles.sub}>管理您的应用设置和偏好。</p>
          </header>

          {/* 用户设置 */}
          <section className={styles.card} aria-labelledby="sec-user">
            <h2 id="sec-user" className={styles.cardHeader}>用户设置</h2>
            <div className={styles.row}>
              <div>
                <div className={styles.avatarWrap} onClick={handleSelectAvatar} role="button" aria-label="更改头像"
                     title="更改头像" tabIndex={0}
                     onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectAvatar()}>
                  <img src={avatarSrc} alt="Avatar" className={styles.avatarImg}
                       onError={(e) => ((e.currentTarget.src = 'https://via.placeholder.com/96/374151/FFFFFF?text=Avatar'))} />
                  <div className={styles.avatarMask}>更改头像</div>
                </div>
                <input ref={avatarInputRef} id="avatarUploadInput" type="file" accept="image/*"
                       onChange={handleAvatarChange} hidden />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="username" className={styles.label}>用户名</label>
                <input id="username" className={styles.input} type="text"
                       value={username} onChange={(e) => setUsername(e.target.value)} placeholder="输入您的昵称" />
              </div>
            </div>
          </section>

          {/* HiFiNi Cookie */}
          <section className={styles.card} aria-labelledby="sec-hifini">
            <h2 id="sec-hifini" className={styles.cardHeader}>HiFiNi Cookie 设置</h2>

            <div className={styles.inputGroup}>
              <label htmlFor="bbs_token" className={styles.label}>bbs_token</label>
              <input id="bbs_token" className={styles.input} type="text"
                     value={bbsToken} onChange={(e) => setBbsToken(e.target.value)} placeholder="粘贴 bbs_token" />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="bbs_sid" className={styles.label}>bbs_sid</label>
              <input id="bbs_sid" className={styles.input} type="text"
                     value={bbsSid} onChange={(e) => setBbsSid(e.target.value)} placeholder="粘贴 bbs_sid" />
            </div>
          </section>

          {/* 本地扫描路径 */}
          <section className={styles.card} aria-labelledby="sec-scan">
            <h2 id="sec-scan" className={styles.cardHeader}>本地音乐扫描路径</h2>

            <ScanPathList items={scanPaths} onItemsChange={setScanPaths} />

            <div className={styles.toolbar}>
              <input className={styles.input} type="text" placeholder="输入或选择新的扫描路径"
                     value={newScanPath} onChange={(e) => setNewScanPath(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddScanPath()} />
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={handleOpenDirectoryDialog}
                      title="选择文件夹">
                <FolderIcon /><span>选择文件夹</span>
              </button>
              <button className={styles.btn} onClick={handleAddScanPath}>添加路径</button>
            </div>
          </section>

          {/* 应用管理 */}
          <section className={styles.card} aria-labelledby="sec-app">
            <h2 id="sec-app" className={styles.cardHeader}>应用管理</h2>

            <div className={styles.row}>
              <div>
                <div className={styles.kicker}>已用缓存空间</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {formatStorageUnit(diskByteUsage)}
                </div>
              </div>
              <div style={{ justifySelf: 'end' }}>
                <button className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => systemContext.revealDataBaseInFileSystem()}>
                  显示数据库文件
                </button>
              </div>
            </div>
          </section>

          {/* 保存 */}
          <section className={styles.card} aria-labelledby="sec-save">
            <h2 id="sec-save" className={styles.cardHeader} style={{ display: 'none' }}>保存</h2>
            <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
              <button className={styles.primarySave} onClick={handleSaveAll} disabled={isSaving}>
                {isSaving ? '保存中…' : '保存所有更改'}
              </button>
              {!!message && (
                <div role="status"
                     className={`${styles.toast} ${message.includes('失败') ? styles.toastErr : styles.toastOk}`}>
                  {message}
                </div>
              )}
            </div>
          </section>

          {/* 页脚 */}
          <footer className={styles.footer}>
            <div>版本号: {appVersion}</div>
            <div>作者: {author}</div>
            <small>
              &copy; {new Date().getFullYear()} 本软件是<strong>自由软件</strong>，欢迎自由使用、复制、分发和修改。
            </small>
          </footer>
        </div>
      </div>
    </ViewShell>
  );
}

/** 扫描路径列表（内联组件，沿用模块样式） */
interface ScanPathListProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
}

function ScanPathList({ items, onItemsChange }: ScanPathListProps) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (i: number) => {
    setEditIndex(i);
    setEditValue(items[i]);
  };
  const cancelEdit = () => {
    setEditIndex(null);
    setEditValue('');
  };

  const saveEdit = (i: number) => {
    const v = (editValue || '').trim();
    if (!v) return;
    const next = items.map((x, idx) => (idx === i ? v : x));
    onItemsChange(next);
    cancelEdit();
  };
  const remove = (i: number) => onItemsChange(items.filter((_, idx) => idx !== i));

  if (!items?.length) {
    return <p className={styles.sub} style={{ fontStyle: 'italic' }}>暂无扫描路径。请在下方添加。</p>;
  }

  return (
    <div className={styles.scanList}>
      {items.map((item, i) => (
        <div key={`${item}_${i}`} className={styles.scanRow}>
          {editIndex === i ? (
            <>
              <input className={styles.input} autoFocus value={editValue}
                     onChange={(e) => setEditValue(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && saveEdit(i)} />
              <div className={styles.scanRowBtns}>
                <button className={styles.btn} onClick={() => saveEdit(i)}>保存</button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={cancelEdit}>取消</button>
              </div>
            </>
          ) : (
            <>
              <span className={styles.scanText} title={item}>{item}</span>
              <div className={styles.scanRowBtns}>
                <button className={styles.iconBtn} onClick={() => startEdit(i)} title="编辑" aria-label="编辑">
                  <EditIcon />
                </button>
                <button className={styles.iconBtn} onClick={() => remove(i)} title="删除" aria-label="删除">
                  <DeleteIcon />
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProfileView;