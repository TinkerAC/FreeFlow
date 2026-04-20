import React from 'react';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import { profileContext } from '@renderer/core/electronContextApi';
import { logoutWeb25Session, useWeb25SessionState } from '@renderer/core/web25/auth';
import {
  getCurrentWeb25UserProfile,
  updateCurrentWeb25UserProfile,
  uploadWeb25UserAvatar,
  type Web25UserProfile,
} from '@renderer/core/web25/client';
import { getChainLibraryTracks, subscribeChainLibraryUpdated } from '@renderer/core/freeflow/chainLibrary';
import type { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import type { ProfileSummary } from '@src/shared/profile/profile';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import styles from './ProfileView.module.css';

function formatAddress(value?: string) {
  if (!value) return '-';
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ProfileView() {
  const { address, chainId, isConnected } = useWalletRuntimeState();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session, refresh, refreshing } = useWeb25SessionState(web25BaseUrl.value);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [statusText, setStatusText] = React.useState('');
  const [userProfile, setUserProfile] = React.useState<Web25UserProfile | null>(null);
  const [activeProfile, setActiveProfile] = React.useState<ProfileSummary | null>(null);
  const [draftDisplayName, setDraftDisplayName] = React.useState('');
  const [chainTracks, setChainTracks] = React.useState<TrackEntity[]>([]);
  const [libraryBusy, setLibraryBusy] = React.useState(false);

  const identityAddress = session?.address ?? userProfile?.walletAddress ?? activeProfile?.walletAddress ?? address;
  const identityChainId = session?.chainId ?? activeProfile?.chainId ?? chainId;
  const web3AddressMismatch = Boolean(
    session?.address && address && session.address.toLowerCase() !== address.toLowerCase(),
  );
  const downloadedTrackCount = chainTracks.filter((track) => track.downloaded).length;
  const isSignedIn = Boolean(session);
  const displayName = (userProfile?.displayName || activeProfile?.web25DisplayName || '').trim();

  React.useEffect(() => {
    void refresh().catch(() => {
    });
    void profileContext.getActiveProfile()
      .then(setActiveProfile)
      .catch(() => setActiveProfile(null));
  }, [refresh]);

  const syncProfileMetadataToLocalIndex = React.useCallback(async (profile: Web25UserProfile | null) => {
    if (!profile) return;
    try {
      const activeProfile = await profileContext.getActiveProfile();
      await profileContext.updateProfileMetadata({
        profileId: activeProfile.id,
        patch: {
          web25DisplayName: profile.displayName || null,
          web25AvatarUrl: profile.avatarUrl,
        },
      });
    } catch {
      // ignore profile metadata sync failures on UI side
    }
  }, []);

  const loadWeb25UserProfile = React.useCallback(async () => {
    if (!session) {
      setUserProfile(null);
      setDraftDisplayName('');
      return;
    }

    const profile = await getCurrentWeb25UserProfile(web25BaseUrl.value);
    setUserProfile(profile);
    setDraftDisplayName(profile.displayName || '');
    await syncProfileMetadataToLocalIndex(profile);
  }, [session, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  React.useEffect(() => {
    void loadWeb25UserProfile().catch((error) => {
      setStatusText(`读取用户资料失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    });
  }, [loadWeb25UserProfile]);

  const handleSiweLogout = React.useCallback(async () => {
    setAuthBusy(true);
    setStatusText('');
    try {
      await logoutWeb25Session(web25BaseUrl.value, { clearLocalScope: 'all-profiles' });
      setUserProfile(null);
      setDraftDisplayName('');
      await refresh();
      await profileContext.restartToGuide();
    } catch (error) {
      setStatusText(`退出失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setAuthBusy(false);
    }
  }, [refresh, web25BaseUrl.value]);

  const restartToGuide = React.useCallback(() => {
    void profileContext.restartToGuide();
  }, []);

  const ensureSession = React.useCallback(() => {
    if (session) return true;
    setStatusText('请先重启应用并在 Guide 完成 SIWE 登录');
    return false;
  }, [session]);

  const handleSaveUserProfile = React.useCallback(async () => {
    if (!ensureSession()) return;
    setProfileBusy(true);
    setStatusText('');
    try {
      const updated = await updateCurrentWeb25UserProfile(web25BaseUrl.value, {
        displayName: draftDisplayName.trim(),
      });
      setUserProfile(updated);
      setDraftDisplayName(updated.displayName || '');
      await syncProfileMetadataToLocalIndex(updated);
      setStatusText('用户资料已更新');
    } catch (error) {
      setStatusText(`更新资料失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setProfileBusy(false);
    }
  }, [draftDisplayName, ensureSession, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const handleClearAvatar = React.useCallback(async () => {
    if (!ensureSession()) return;
    setProfileBusy(true);
    setStatusText('');
    try {
      const updated = await updateCurrentWeb25UserProfile(web25BaseUrl.value, {
        avatarUrl: null,
      });
      setUserProfile(updated);
      await syncProfileMetadataToLocalIndex(updated);
      setStatusText('头像已移除');
    } catch (error) {
      setStatusText(`移除头像失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setProfileBusy(false);
    }
  }, [ensureSession, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const handleAvatarFileChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ensureSession()) return;
    setProfileBusy(true);
    setStatusText('');
    try {
      const updated = await uploadWeb25UserAvatar(web25BaseUrl.value, file);
      setUserProfile(updated);
      await syncProfileMetadataToLocalIndex(updated);
      setStatusText('头像已上传到 Imgur');
    } catch (error) {
      setStatusText(`上传头像失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setProfileBusy(false);
    }
  }, [ensureSession, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const refreshChainLibraryStats = React.useCallback(async () => {
    setLibraryBusy(true);
    try {
      setChainTracks(await getChainLibraryTracks());
    } finally {
      setLibraryBusy(false);
    }
  }, []);

  React.useEffect(() => {
    void refreshChainLibraryStats().catch(() => {
    });
    return subscribeChainLibraryUpdated(() => {
      void refreshChainLibraryStats();
    });
  }, [refreshChainLibraryStats]);

  const identityRows = [
    { label: 'Profile 状态', value: activeProfile ? `已启用 (${activeProfile.id})` : '未加载' },
    { label: '连接状态', value: isSignedIn ? 'Web2.5 已登录' : (isConnected ? '钱包已连接' : '未连接') },
    { label: '身份地址', value: formatAddress(identityAddress) },
    { label: '链 ID', value: identityChainId ?? '-' },
    { label: '签名钱包', value: web3AddressMismatch ? `待同步 ${formatAddress(address)}` : formatAddress(address) },
  ];

  const sessionRows = [
    { label: 'Session ID', value: session?.sessionId ?? '-' },
    { label: '签发时间', value: formatDateTime(session?.issuedAt) },
    { label: '验证时间', value: formatDateTime(session?.verifiedAt) },
    { label: '用户 ID', value: userProfile?.userId ?? '-' },
    { label: '绑定地址', value: formatAddress(userProfile?.walletAddress ?? undefined) },
    { label: '资料更新时间', value: formatDateTime(userProfile?.updatedAt) },
  ];

  return (
    <ViewShell hideScrollbar>
      <div className={styles.root}>
        <section className={styles.hero}>
          <div className={styles.heroIdentity}>
            {userProfile?.avatarUrl ? (
              <img className={styles.avatarPreview} src={userProfile.avatarUrl} alt={displayName || 'avatar'} />
            ) : (
              <div className={styles.avatarFallback}>
                {(displayName.slice(0, 2) || identityAddress?.slice(2, 4) || 'FF').toUpperCase()}
              </div>
            )}
            <div className={styles.heroText}>
              <h1 className={styles.title}>{displayName || '未命名用户'}</h1>
              <p className={styles.sub}>{formatAddress(identityAddress)} · Chain {identityChainId ?? '-'}</p>
            </div>
          </div>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} onClick={restartToGuide}>
              重启并前往 Guide
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => void handleSiweLogout()}
              disabled={authBusy || !session}
            >
              {authBusy ? '退出中...' : '退出并重启'}
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              {refreshing ? '刷新中...' : '刷新会话'}
            </button>
          </div>
        </section>

        <div className={styles.mainGrid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>资料设置</h2>
              <p className={styles.panelSub}>同步 Web2.5 用户资料并写回本地 Profile 元数据。</p>
            </div>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span className={styles.label}>显示名称</span>
                <input
                  className={styles.input}
                  value={draftDisplayName}
                  onChange={(event) => setDraftDisplayName(event.target.value)}
                  placeholder="输入名称"
                  disabled={!session || profileBusy}
                />
              </label>

              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  onClick={() => void handleSaveUserProfile()}
                  disabled={profileBusy || !session}
                >
                  {profileBusy ? '保存中...' : '保存资料'}
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={profileBusy || !session}
                >
                  上传头像
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => void handleClearAvatar()}
                  disabled={profileBusy || !session || !userProfile?.avatarUrl}
                >
                  移除头像
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.hiddenInput}
                onChange={(event) => {
                  void handleAvatarFileChange(event);
                }}
              />
            </div>
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <h2 className={styles.panelTitle}>身份与会话</h2>
              <p className={styles.panelSub}>统一展示 Wallet、Profile 和 SIWE 会话状态。</p>
            </div>

            <div className={styles.infoGrid}>
              {identityRows.map((row) => (
                <div key={row.label} className={styles.infoItem}>
                  <span className={styles.label}>{row.label}</span>
                  <span className={styles.value}>{row.value}</span>
                </div>
              ))}
              {sessionRows.map((row) => (
                <div key={row.label} className={styles.infoItem}>
                  <span className={styles.label}>{row.label}</span>
                  <span className={styles.value}>{row.value}</span>
                </div>
              ))}
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Web2.5 Backend URL</span>
              <input
                className={styles.input}
                value={web25BaseUrl.value}
                onChange={(event) => web25BaseUrl.setValue(event.target.value)}
              />
            </label>
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>链上音乐库</h2>
            <p className={styles.panelSub}>当前 Profile 管理的链上资源与下载完成度。</p>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => void refreshChainLibraryStats()}
              disabled={libraryBusy}
            >
              {libraryBusy ? '刷新中...' : '刷新状态'}
            </button>
          </div>
          <div className={styles.libraryStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>已入库</span>
              <span className={styles.statValue}>{chainTracks.length}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>已下载</span>
              <span className={styles.statValue}>{downloadedTrackCount}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>完成率</span>
              <span className={styles.statValue}>
                {chainTracks.length === 0 ? '0%' : `${Math.round((downloadedTrackCount / chainTracks.length) * 100)}%`}
              </span>
            </div>
          </div>
        </section>

        {statusText && <div className={styles.status}>{statusText}</div>}
      </div>
    </ViewShell>
  );
}
