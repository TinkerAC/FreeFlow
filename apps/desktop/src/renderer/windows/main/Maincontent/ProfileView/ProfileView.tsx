import React from 'react';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { profileContext } from '@renderer/core/electronContextApi';
import { logoutWeb25Session, useWeb25SessionState } from '@renderer/core/web25/auth';
import {
  getCurrentWeb25UserProfile,
  updateCurrentWeb25UserProfile,
  uploadWeb25UserAvatar,
  type Web25UserProfile,
} from '@renderer/core/web25/client';
import { syncOwnedFreeFlowLibrary } from '@renderer/core/freeflow/ownedLibrary';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import styles from './ProfileView.module.css';

function formatAddress(value?: string) {
  if (!value) return '-';
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function ProfileView() {
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const web25BaseUrl = useSetting<string>('services.web25Backend.baseUrl', 'http://localhost:8787');
  const { session, refresh, refreshing } = useWeb25SessionState(web25BaseUrl.value);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [authBusy, setAuthBusy] = React.useState(false);
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [statusText, setStatusText] = React.useState('');
  const [syncStats, setSyncStats] = React.useState<{ owned: number; indexed: number } | null>(null);
  const [userProfile, setUserProfile] = React.useState<Web25UserProfile | null>(null);
  const [draftDisplayName, setDraftDisplayName] = React.useState('');

  React.useEffect(() => {
    void refresh().catch(() => {
    });
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
      setSyncStats(null);
      await refresh();
      await profileContext.exitToGuide();
    } catch (error) {
      setStatusText(`退出失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setAuthBusy(false);
    }
  }, [refresh, web25BaseUrl.value]);

  const handleSaveUserProfile = React.useCallback(async () => {
    if (!session) {
      setStatusText('请先返回引导完成 SIWE 登录');
      return;
    }
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
  }, [draftDisplayName, session, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const handleClearAvatar = React.useCallback(async () => {
    if (!session) {
      setStatusText('请先返回引导完成 SIWE 登录');
      return;
    }
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
  }, [session, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const handleAvatarFileChange = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!session) {
      setStatusText('请先返回引导完成 SIWE 登录');
      return;
    }
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
  }, [session, syncProfileMetadataToLocalIndex, web25BaseUrl.value]);

  const handleSyncOwned = React.useCallback(async () => {
    if (!walletProvider || !address) {
      setStatusText('请返回 Profile 引导连接钱包');
      return;
    }
    setSyncBusy(true);
    setStatusText('');
    try {
      const result = await syncOwnedFreeFlowLibrary({
        baseUrl: web25BaseUrl.value,
        walletProvider,
        account: address,
      });
      setSyncStats({
        owned: result.ownedTracks.length,
        indexed: result.indexedCount,
      });
      setStatusText(`已同步 ${result.ownedTracks.length} 条链上资源`);
    } catch (error) {
      setStatusText(`资源同步失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setSyncBusy(false);
    }
  }, [address, walletProvider, web25BaseUrl.value]);

  return (
    <ViewShell hideScrollbar>
      <div className={styles.root}>
        <section className={styles.block}>
          <h1 className={styles.title}>账户中心</h1>
          <p className={styles.sub}>管理 Web2.5 身份资料与链上资源同步。</p>
        </section>

        <section className={styles.block}>
          <div className={styles.blockTitle}>Web2.5 身份资料</div>
          <div className={styles.profileCard}>
            <div className={styles.avatarPane}>
              {userProfile?.avatarUrl ? (
                <img className={styles.avatarPreview} src={userProfile.avatarUrl} alt={userProfile.displayName || 'avatar'} />
              ) : (
                <div className={styles.avatarFallback}>
                  {(userProfile?.displayName?.slice(0, 2) || address?.slice(2, 4) || 'FF').toUpperCase()}
                </div>
              )}
              <div className={styles.actions}>
                <button
                  className={styles.primaryButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={profileBusy || !session}
                >
                  {profileBusy ? '处理中...' : '上传头像'}
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => void handleClearAvatar()}
                  disabled={profileBusy || !session || !userProfile?.avatarUrl}
                >
                  移除头像
                </button>
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
            </div>

            <div className={styles.profileForm}>
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
                  onClick={() => {
                    void profileContext.exitToGuide();
                  }}
                >
                  返回引导
                </button>
              </div>
              <div className={styles.grid}>
                <div className={styles.item}>
                  <span className={styles.label}>用户 ID</span>
                  <span className={styles.value}>{userProfile?.userId ?? '-'}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>绑定地址</span>
                  <span className={styles.value}>{formatAddress(userProfile?.walletAddress ?? undefined)}</span>
                </div>
                <div className={styles.item}>
                  <span className={styles.label}>资料更新时间</span>
                  <span className={styles.value}>{userProfile?.updatedAt ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockTitle}>钱包</div>
          <div className={styles.grid}>
            <div className={styles.item}>
              <span className={styles.label}>连接状态</span>
              <span className={styles.value}>{isConnected ? '已连接' : '未连接'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>地址</span>
              <span className={styles.value}>{formatAddress(address)}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>链 ID</span>
              <span className={styles.value}>{chainId ?? '-'}</span>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => {
                void profileContext.exitToGuide();
              }}
            >
              {isConnected ? '切换 Profile' : '返回 Profile 引导'}
            </button>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockTitle}>SIWE / Web2.5</div>
          <label className={styles.field}>
            <span className={styles.label}>Backend URL</span>
            <input
              className={styles.input}
              value={web25BaseUrl.value}
              onChange={(event) => web25BaseUrl.setValue(event.target.value)}
            />
          </label>

          <div className={styles.grid}>
            <div className={styles.item}>
              <span className={styles.label}>会话状态</span>
              <span className={styles.value}>{session ? '已登录' : '未登录'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>会话地址</span>
              <span className={styles.value}>{formatAddress(session?.address)}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>会话链 ID</span>
              <span className={styles.value}>{session?.chainId ?? '-'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>Session ID</span>
              <span className={styles.value}>{session?.sessionId ?? '-'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>签发时间</span>
              <span className={styles.value}>{session?.issuedAt ?? '-'}</span>
            </div>
            <div className={styles.item}>
              <span className={styles.label}>验证时间</span>
              <span className={styles.value}>{session?.verifiedAt ?? '-'}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => void profileContext.exitToGuide()}
              disabled={authBusy}
            >
              前往引导登录
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => void handleSiweLogout()}
              disabled={authBusy || !session}
            >
              退出并返回引导
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => void refresh()}
              disabled={refreshing}
            >
              {refreshing ? '刷新中...' : '刷新状态'}
            </button>
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockTitle}>链上音乐库同步</div>
          <p className={styles.sub}>把当前钱包拥有访问权的资源同步到主音乐库。</p>
          <div className={styles.actions}>
            <button
              className={styles.primaryButton}
              onClick={() => void handleSyncOwned()}
              disabled={syncBusy}
            >
              {syncBusy ? '同步中...' : '同步拥有资源'}
            </button>
          </div>
          {syncStats && (
            <div className={styles.stats}>
              已拥有 {syncStats.owned} / 已扫描 {syncStats.indexed}
            </div>
          )}
        </section>

        {statusText && <div className={styles.status}>{statusText}</div>}
      </div>
    </ViewShell>
  );
}
