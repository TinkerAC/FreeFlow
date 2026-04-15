import React from 'react';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSetting } from '@renderer/core/config/SettingsContext';
import { profileContext } from '@renderer/core/electronContextApi';
import { loginWeb25WithSiwe, logoutWeb25Session, useWeb25SessionState } from '@renderer/core/web25/auth';
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

  const [authBusy, setAuthBusy] = React.useState(false);
  const [syncBusy, setSyncBusy] = React.useState(false);
  const [statusText, setStatusText] = React.useState('');
  const [syncStats, setSyncStats] = React.useState<{ owned: number; indexed: number } | null>(null);

  React.useEffect(() => {
    void refresh().catch(() => {
    });
  }, [refresh]);

  const handleSiweLogin = React.useCallback(async () => {
    if (!walletProvider) {
      setStatusText('请返回 Profile 引导连接钱包');
      return;
    }
    setAuthBusy(true);
    setStatusText('');
    try {
      await loginWeb25WithSiwe({
        baseUrl: web25BaseUrl.value,
        walletProvider,
        fallbackAddress: address,
      });
      await refresh();
      setStatusText('SIWE 登录成功');
    } catch (error) {
      setStatusText(`SIWE 登录失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setAuthBusy(false);
    }
  }, [address, refresh, walletProvider, web25BaseUrl.value]);

  const handleSiweLogout = React.useCallback(async () => {
    setAuthBusy(true);
    setStatusText('');
    try {
      await logoutWeb25Session(web25BaseUrl.value);
      await refresh();
      setStatusText('已退出 SIWE 会话');
    } catch (error) {
      setStatusText(`退出失败: ${error instanceof Error ? error.message : String(error ?? '')}`);
    } finally {
      setAuthBusy(false);
    }
  }, [refresh, web25BaseUrl.value]);

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
          <h1 className={styles.title}>账户与链上状态</h1>
          <p className={styles.sub}>统一查看钱包、SIWE 会话和 Web2.5 服务状态。</p>
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
            <button className={styles.primaryButton} onClick={() => profileContext.exitToGuide()}>
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
              onClick={() => void handleSiweLogin()}
              disabled={authBusy}
            >
              {authBusy ? '处理中...' : 'SIWE 登录'}
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => void handleSiweLogout()}
              disabled={authBusy || !session}
            >
              退出会话
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
          {statusText && <div className={styles.status}>{statusText}</div>}
        </section>
      </div>
    </ViewShell>
  );
}
