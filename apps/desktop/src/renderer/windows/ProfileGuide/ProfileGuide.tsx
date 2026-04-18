import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { configContext, profileContext, windowControlContext } from '@renderer/core/electronContextApi';
import { getRuntimeProfileId, setRuntimeProfileId } from '@renderer/core/profile/runtimeProfile';
import { loginWeb25WithSiwe, refreshWeb25Session } from '@renderer/core/web25/auth';
import { getCurrentWeb25UserProfile, type Web25Session } from '@renderer/core/web25/client';
import { buildWalletProfileId, type ProfileSummary } from '@src/shared/profile/profile';
import { DEFAULT_SEPOLIA_CONTRACTS } from '@src/shared/web3/freeflowContracts';
import styles from './ProfileGuide.module.css';

type GuideMode = 'select' | 'create';

type RequestingProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

const REQUIRED_CHAIN_ID = DEFAULT_SEPOLIA_CONTRACTS.chainId;
const REQUIRED_CHAIN_HEX = `0x${REQUIRED_CHAIN_ID.toString(16)}`;
const SKIP_AUTO_ENTER_STORAGE_KEY = 'freeflow.profile-guide.skip-auto-enter-once';

function formatAddress(address?: string): string {
  if (!address) return '未连接';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function avatarLabel(profile: ProfileSummary): string {
  if (profile.walletAddress) return profile.walletAddress.slice(2, 4).toUpperCase();
  return profile.name.slice(0, 2).toUpperCase();
}

function formatDate(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isMacPlatform(): boolean {
  return navigator.platform.toLowerCase().includes('mac');
}

function resolveProfileId(targetAddress?: string, explicitProfileId?: string): string {
  if (explicitProfileId) return explicitProfileId;
  if (!targetAddress) return '';
  try {
    return buildWalletProfileId({
      address: targetAddress,
      chainId: REQUIRED_CHAIN_ID,
    });
  } catch {
    return '';
  }
}

function consumeSkipAutoEnterFlag(): boolean {
  if (typeof window === 'undefined') return false;
  const shouldSkip = window.localStorage.getItem(SKIP_AUTO_ENTER_STORAGE_KEY) === '1';
  if (shouldSkip) window.localStorage.removeItem(SKIP_AUTO_ENTER_STORAGE_KEY);
  return shouldSkip;
}

function WindowChrome() {
  const isMac = isMacPlatform();

  if (isMac) {
    return (
      <div className={`${styles.chrome} ${styles.chromeMac}`}>
        <div className={styles.trafficLights}>
          <button type="button" className={styles.closeDot} aria-label="关闭" onClick={() => windowControlContext.close()} />
          <button type="button" className={styles.minDot} aria-label="最小化" onClick={() => windowControlContext.minimize()} />
          <button type="button" className={styles.maxDot} aria-label="最大化" onClick={() => windowControlContext.maximize()} />
        </div>
        <div className={styles.chromeTitle}>FreeFlow Profile</div>
      </div>
    );
  }

  return (
    <div className={styles.chrome}>
      <div className={styles.chromeTitle}>FreeFlow Profile</div>
      <div className={styles.winControls}>
        <button type="button" aria-label="最小化" onClick={() => windowControlContext.minimize()}>-</button>
        <button type="button" aria-label="最大化" onClick={() => windowControlContext.maximize()}>□</button>
        <button type="button" aria-label="关闭" onClick={() => windowControlContext.close()}>×</button>
      </div>
    </div>
  );
}

export default function ProfileGuide() {
  const { open } = useWeb3Modal();
  const { address, chainId, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [mode, setMode] = useState<GuideMode>('select');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [siweBusy, setSiweBusy] = useState(false);
  const [siweSession, setSiweSession] = useState<Web25Session | null>(null);
  const [web25BaseUrl, setWeb25BaseUrl] = useState('http://localhost:8787');
  const [status, setStatus] = useState('选择 Profile，或连接钱包创建新的本地身份。');
  const [error, setError] = useState<string | null>(null);

  const numericChainId = typeof chainId === 'number' ? chainId : Number(chainId);
  const isSepolia = numericChainId === REQUIRED_CHAIN_ID;
  const connectedAddress = address?.toLowerCase();
  const actionBusy = busy || siweBusy;

  const walletProfiles = useMemo(
    () => profiles.filter((profile) => profile.type === 'wallet'),
    [profiles],
  );

  const selectedProfile = useMemo(
    () => walletProfiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [selectedProfileId, walletProfiles],
  );

  const currentWalletProfile = useMemo(
    () => walletProfiles.find((profile) => (
      !!connectedAddress && profile.walletAddress?.toLowerCase() === connectedAddress
    )) ?? null,
    [connectedAddress, walletProfiles],
  );

  const selectedWalletConnected = Boolean(
    selectedProfile?.walletAddress && connectedAddress === selectedProfile.walletAddress.toLowerCase(),
  );

  const createProfileId = useMemo(
    () => resolveProfileId(address),
    [address],
  );

  const hasSiweForAddress = useCallback((targetAddress?: string) => {
    if (!targetAddress || !siweSession) return false;
    return siweSession.chainId === REQUIRED_CHAIN_ID
      && siweSession.address.toLowerCase() === targetAddress.toLowerCase();
  }, [siweSession]);

  const selectedSiweReady = hasSiweForAddress(selectedProfile?.walletAddress);
  const createSiweReady = hasSiweForAddress(address);

  const selectedActionLabel = !selectedProfile
    ? '选择 Profile'
    : !selectedWalletConnected
      ? '连接此钱包'
      : !isSepolia
        ? '启用 Sepolia'
        : !selectedSiweReady
          ? 'SIWE 登录'
          : '进入主界面';

  const createActionLabel = !isConnected
    ? '连接钱包'
    : !isSepolia
      ? '启用 Sepolia'
      : !createSiweReady
        ? 'SIWE 登录'
        : currentWalletProfile
          ? '进入已有 Profile'
          : '创建并进入';

  const reloadProfiles = useCallback(async () => {
    const items = await profileContext.listProfiles();
    setProfiles(items);
    return items;
  }, []);

  const refreshSiweState = useCallback(async (baseUrl: string) => {
    try {
      const session = await refreshWeb25Session(baseUrl);
      setSiweSession(session);
      return session;
    } catch {
      setSiweSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [items, configuredBaseUrl] = await Promise.all([
          profileContext.listProfiles(),
          configContext.get('services.web25Backend.baseUrl'),
        ]);
        if (cancelled) return;

        const resolvedBaseUrl = typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()
          ? configuredBaseUrl.trim()
          : 'http://localhost:8787';

        setProfiles(items);
        setWeb25BaseUrl(resolvedBaseUrl);
        setLoaded(true);

        const runtimeProfileId = getRuntimeProfileId();
        const initialWalletProfile = items.find((profile) => profile.type === 'wallet' && profile.id === runtimeProfileId)
          ?? items.find((profile) => profile.type === 'wallet')
          ?? null;

        if (initialWalletProfile) {
          setSelectedProfileId(initialWalletProfile.id);
          setMode('select');
          setRuntimeProfileId(initialWalletProfile.id);
        } else {
          setSelectedProfileId('');
          setMode('create');
        }

        const restoredSession = await refreshSiweState(resolvedBaseUrl);
        const skipAutoEnter = consumeSkipAutoEnterFlag();
        const canRestoreProfile = !!initialWalletProfile?.walletAddress
          && !!restoredSession
          && restoredSession.chainId === REQUIRED_CHAIN_ID
          && restoredSession.address.toLowerCase() === initialWalletProfile.walletAddress.toLowerCase();

        if (!cancelled && canRestoreProfile && !skipAutoEnter) {
          setStatus('已恢复登录状态，正在进入主界面。');
          await profileContext.enterWalletProfile({
            address: initialWalletProfile.walletAddress,
            chainId: REQUIRED_CHAIN_ID,
          });
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSiweState]);

  useEffect(() => {
    if (!loaded) return;
    if (!walletProfiles.length) {
      setMode('create');
      setSelectedProfileId('');
      return;
    }

    setSelectedProfileId((current) => (
      walletProfiles.some((profile) => profile.id === current) ? current : walletProfiles[0].id
    ));
  }, [loaded, walletProfiles]);

  useEffect(() => {
    if (!loaded || !web25BaseUrl) return;

    const nextProfileId = mode === 'create'
      ? createProfileId
      : selectedProfile?.id ?? '';

    if (!nextProfileId) return;
    setRuntimeProfileId(nextProfileId);
    void refreshSiweState(web25BaseUrl);
  }, [createProfileId, loaded, mode, refreshSiweState, selectedProfile?.id, web25BaseUrl]);

  async function connectWallet() {
    setError(null);
    setStatus('请选择要用于 Profile 的钱包账户。');
    await open();
  }

  async function switchToSepolia() {
    setError(null);
    const provider = walletProvider as RequestingProvider | undefined;
    if (!provider) {
      await open();
      return;
    }

    setBusy(true);
    setStatus('正在启用 Sepolia。');
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: REQUIRED_CHAIN_HEX }],
      });
      setStatus('Sepolia 已启用。');
    } catch (err) {
      const walletError = err as { code?: number };
      if (walletError.code === 4902) {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: REQUIRED_CHAIN_HEX,
            chainName: DEFAULT_SEPOLIA_CONTRACTS.chainName,
            nativeCurrency: {
              name: 'Sepolia Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: [DEFAULT_SEPOLIA_CONTRACTS.rpcUrl],
            blockExplorerUrls: [DEFAULT_SEPOLIA_CONTRACTS.explorerUrl],
          }],
        });
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: REQUIRED_CHAIN_HEX }],
        });
        setStatus('Sepolia 已添加并启用。');
        return;
      }

      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function syncProfileMetadata(profileId: string) {
    if (!profileId) return;
    try {
      const web25User = await getCurrentWeb25UserProfile(web25BaseUrl);
      await profileContext.updateProfileMetadata({
        profileId,
        patch: {
          web25DisplayName: web25User.displayName || null,
          web25AvatarUrl: web25User.avatarUrl,
        },
      });
      await reloadProfiles();
    } catch {
      // Ignore profile metadata sync failures to avoid blocking auth flow.
    }
  }

  async function performSiweLogin(targetAddress?: string, explicitProfileId?: string) {
    if (!targetAddress) {
      setStatus('请先连接钱包。');
      return false;
    }
    if (!walletProvider) {
      await open();
      return false;
    }

    const profileId = resolveProfileId(targetAddress, explicitProfileId);
    if (profileId) setRuntimeProfileId(profileId);

    setError(null);
    setSiweBusy(true);
    setStatus(`正在为 ${formatAddress(targetAddress)} 发起 SIWE 登录。`);
    try {
      const session = await loginWeb25WithSiwe({
        baseUrl: web25BaseUrl,
        walletProvider,
        expectedAddress: targetAddress,
      });
      setSiweSession(session);
      if (explicitProfileId) await syncProfileMetadata(profileId);
      setStatus(`SIWE 登录成功：${formatAddress(session.address)}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('SIWE 登录失败，请检查钱包当前账户、签名确认和后端地址。');
      return false;
    } finally {
      setSiweBusy(false);
    }
  }

  async function enterWalletProfile(profileAddress?: string, explicitProfileId?: string) {
    const targetAddress = profileAddress ?? siweSession?.address ?? address;
    if (!targetAddress) return;
    if (!hasSiweForAddress(targetAddress)) {
      setStatus('请先完成 SIWE 登录。');
      return;
    }

    const profileId = resolveProfileId(targetAddress, explicitProfileId);
    if (profileId) setRuntimeProfileId(profileId);

    setBusy(true);
    setError(null);
    setStatus('正在加载 Profile。');
    try {
      await profileContext.enterWalletProfile({
        address: targetAddress,
        chainId: REQUIRED_CHAIN_ID,
      });
      await syncProfileMetadata(profileId);
      setStatus('Profile 已加载。');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('请重新确认钱包、网络和 SIWE 登录状态。');
    } finally {
      setBusy(false);
    }
  }

  async function useSelectedProfile() {
    if (!selectedProfile) return;
    if (!selectedWalletConnected) {
      await connectWallet();
      return;
    }
    if (!isSepolia) {
      await switchToSepolia();
      return;
    }
    if (!selectedSiweReady) {
      const ok = await performSiweLogin(selectedProfile.walletAddress, selectedProfile.id);
      if (!ok) return;
    }
    await enterWalletProfile(selectedProfile.walletAddress, selectedProfile.id);
  }

  async function useCurrentWalletProfile() {
    if (!isConnected || !address) {
      await connectWallet();
      return;
    }
    if (!isSepolia) {
      await switchToSepolia();
      return;
    }
    if (!createSiweReady) {
      const ok = await performSiweLogin(address);
      if (!ok) return;
    }
    await enterWalletProfile(address);
  }

  const createPanel = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p>Wallet Profile</p>
          <h1>连接当前钱包</h1>
          <span>为当前钱包地址创建或恢复本地 Profile。</span>
        </div>
        {walletProfiles.length > 0 && (
          <button type="button" className={styles.textButton} onClick={() => setMode('select')} disabled={actionBusy}>
            返回选择
          </button>
        )}
      </div>

      <div className={styles.identityCard}>
        <div className={styles.largeAvatar}>{address ? address.slice(2, 4).toUpperCase() : 'FF'}</div>
        <div className={styles.identityText}>
          <strong>{formatAddress(address)}</strong>
          <span>{currentWalletProfile ? '该地址已有本地 Profile' : '将使用当前钱包地址创建 Profile'}</span>
        </div>
      </div>

      <div className={styles.stepGrid}>
        <button type="button" className={styles.step} onClick={connectWallet} disabled={actionBusy}>
          <span className={isConnected ? styles.stepDone : styles.stepIndex}>1</span>
          <strong>{isConnected ? '钱包已连接' : '连接钱包'}</strong>
          <small>{isConnected ? formatAddress(address) : '选择要使用的账户'}</small>
        </button>

        <button type="button" className={styles.step} onClick={switchToSepolia} disabled={actionBusy || !isConnected || isSepolia}>
          <span className={isSepolia ? styles.stepDone : styles.stepIndex}>2</span>
          <strong>{isSepolia ? 'Sepolia 已启用' : '启用 Sepolia'}</strong>
          <small>当前网络: {chainId ?? '未连接'}</small>
        </button>

        <button
          type="button"
          className={styles.step}
          onClick={() => {
            void performSiweLogin(address);
          }}
          disabled={actionBusy || !isConnected || !isSepolia || !address}
        >
          <span className={createSiweReady ? styles.stepDone : styles.stepIndex}>3</span>
          <strong>{createSiweReady ? 'SIWE 已登录' : 'SIWE 登录'}</strong>
          <small>{siweSession ? `会话地址: ${formatAddress(siweSession.address)}` : '用当前账户签名'}</small>
        </button>
      </div>

      <button type="button" className={styles.primaryAction} onClick={() => void useCurrentWalletProfile()} disabled={actionBusy}>
        {actionBusy ? '处理中' : createActionLabel}
      </button>

      <p className={styles.status}>{status}</p>
    </section>
  );

  const selectorPanel = (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <p>Choose Profile</p>
          <h1>FreeFlow</h1>
          <span>选择一个本地身份，或连接当前钱包创建新身份。</span>
        </div>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => {
            setMode('create');
            setSelectedProfileId('');
            setError(null);
            setStatus('连接钱包并完成 SIWE 登录。');
          }}
          disabled={actionBusy}
        >
          新建 Profile
        </button>
      </div>

      <div className={styles.profileList}>
        {walletProfiles.map((profile) => (
          <button
            type="button"
            key={profile.id}
            className={`${styles.profileTile} ${selectedProfile?.id === profile.id ? styles.profileTileActive : ''}`}
            onClick={() => setSelectedProfileId(profile.id)}
          >
            <div className={styles.avatarFace}>
              {profile.web25AvatarUrl ? (
                <img src={profile.web25AvatarUrl} alt={profile.web25DisplayName || profile.name} />
              ) : (
                <span>{avatarLabel(profile)}</span>
              )}
            </div>
            <div>
              <strong>{profile.web25DisplayName || formatAddress(profile.walletAddress)}</strong>
              <small>{formatAddress(profile.walletAddress)}</small>
            </div>
          </button>
        ))}
      </div>

      {selectedProfile && (
        <div className={styles.details}>
          <div className={styles.identityCard}>
            <div className={styles.largeAvatar}>
              {selectedProfile.web25AvatarUrl ? (
                <img src={selectedProfile.web25AvatarUrl} alt={selectedProfile.web25DisplayName || selectedProfile.name} />
              ) : (
                <span>{avatarLabel(selectedProfile)}</span>
              )}
            </div>
            <div className={styles.identityText}>
              <strong>{selectedProfile.web25DisplayName || formatAddress(selectedProfile.walletAddress)}</strong>
              <span>{selectedWalletConnected ? '当前钱包已匹配' : `需要连接 ${formatAddress(selectedProfile.walletAddress)}`}</span>
            </div>
          </div>

          <dl className={styles.metaGrid}>
            <div>
              <dt>Network</dt>
              <dd>Sepolia</dd>
            </div>
            <div>
              <dt>SIWE</dt>
              <dd>{selectedSiweReady ? formatAddress(siweSession?.address) : '未登录'}</dd>
            </div>
            <div>
              <dt>Last</dt>
              <dd>{formatDate(selectedProfile.updatedAt)}</dd>
            </div>
          </dl>

          <button type="button" className={styles.primaryAction} onClick={() => void useSelectedProfile()} disabled={actionBusy || !selectedProfile}>
            {actionBusy ? '处理中' : selectedActionLabel}
          </button>
        </div>
      )}

      <p className={styles.status}>{status}</p>
    </section>
  );

  return (
    <main className={styles.window}>
      <WindowChrome />
      <div className={styles.content}>
        {loaded && mode === 'select' && walletProfiles.length > 0 ? selectorPanel : createPanel}
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </main>
  );
}
