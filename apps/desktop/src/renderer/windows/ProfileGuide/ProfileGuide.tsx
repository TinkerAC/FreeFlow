import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { configContext, profileContext, windowControlContext } from '@renderer/core/electronContextApi';
import { getRuntimeProfileId, setRuntimeProfileId } from '@renderer/core/profile/runtimeProfile';
import {
  formatShortAddress,
  getWalletAddress,
  sameAddress,
} from '@renderer/core/profile/profileIdentity';
import { ensureWalletChain, type RequestingProvider, type WalletChainConfig } from '@renderer/core/web3/walletNetwork';
import { loginWeb25WithSiwe, refreshWeb25Session } from '@renderer/core/web25/auth';
import { getCurrentWeb25UserProfile, type Web25Session } from '@renderer/core/web25/client';
import { buildWalletProfileId, type ProfileSummary } from '@src/shared/profile/profile';
import { DEFAULT_SEPOLIA_CONTRACTS } from '@src/shared/web3/freeflowContracts';
import styles from './ProfileGuide.module.css';

type GuideMode = 'select' | 'create';

const REQUIRED_CHAIN_ID = DEFAULT_SEPOLIA_CONTRACTS.chainId;
const DEFAULT_WEB25_BASE_URL = 'http://localhost:8787';
const formatAddress = formatShortAddress;
const SIWE_CHAIN: WalletChainConfig = {
  chainId: DEFAULT_SEPOLIA_CONTRACTS.chainId,
  chainName: DEFAULT_SEPOLIA_CONTRACTS.chainName,
  rpcUrl: DEFAULT_SEPOLIA_CONTRACTS.rpcUrl,
  explorerUrl: DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

function avatarLabel(profile: ProfileSummary): string {
  if (profile.walletAddress) return profile.walletAddress.slice(2, 4).toUpperCase();
  return profile.name.slice(0, 2).toUpperCase();
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

async function loadGuideWeb25BaseUrl(): Promise<string> {
  try {
    const configured = await configContext.get('services.web25Backend.baseUrl');
    return typeof configured === 'string' && configured.trim()
      ? configured.trim()
      : DEFAULT_WEB25_BASE_URL;
  } catch {
    // Runtime config IPC is registered only after a Profile enters the main app.
    // The guide must stay usable before that point.
    return DEFAULT_WEB25_BASE_URL;
  }
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
  const [web25BaseUrl, setWeb25BaseUrl] = useState(DEFAULT_WEB25_BASE_URL);
  const [status, setStatus] = useState('选择一个 Profile。');
  const [error, setError] = useState<string | null>(null);

  const numericChainId = typeof chainId === 'number' ? chainId : Number(chainId);
  const isSepolia = numericChainId === REQUIRED_CHAIN_ID;
  const connectedAddress = getWalletAddress(address);
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
      !!connectedAddress && sameAddress(profile.walletAddress, connectedAddress)
    )) ?? null,
    [connectedAddress, walletProfiles],
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

  const createSiweReady = hasSiweForAddress(address);

  const createActionLabel = !isConnected
    ? '连接钱包'
    : !isSepolia
      ? '切换到 Sepolia'
      : !createSiweReady
        ? '登录'
        : currentWalletProfile
          ? '进入已有 Profile'
          : '创建并进入';

  const reloadProfiles = useCallback(async () => {
    const items = await profileContext.listProfiles();
    setProfiles(items);
    return items;
  }, []);

  const refreshSiweState = useCallback(async (baseUrl: string, expectedAddress?: string | null) => {
    try {
      const session = await refreshWeb25Session(baseUrl, {
        expectedAddress,
        expectedChainId: REQUIRED_CHAIN_ID,
      });
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
        const [items, resolvedBaseUrl] = await Promise.all([
          profileContext.listProfiles(),
          loadGuideWeb25BaseUrl(),
        ]);
        if (cancelled) return;

        const savedWalletProfiles = items.filter((profile) => profile.type === 'wallet');
        const runtimeProfileId = getRuntimeProfileId();
        const initialWalletProfile = savedWalletProfiles.find((profile) => profile.id === runtimeProfileId)
          ?? savedWalletProfiles[0]
          ?? null;

        setProfiles(items);
        setWeb25BaseUrl(resolvedBaseUrl);
        setLoaded(true);
        setMode('select');
        setStatus(initialWalletProfile ? '选择要进入的 Profile。' : '还没有 Profile，点击加号创建。');

        if (initialWalletProfile) {
          setSelectedProfileId(initialWalletProfile.id);
          setRuntimeProfileId(initialWalletProfile.id);
        } else {
          setSelectedProfileId('');
        }

        await refreshSiweState(resolvedBaseUrl, initialWalletProfile?.walletAddress);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoaded(true);
        setMode('select');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshSiweState]);

  useEffect(() => {
    if (!loaded || !walletProfiles.length) return;
    setSelectedProfileId((current) => (
      walletProfiles.some((profile) => profile.id === current) ? current : walletProfiles[0].id
    ));
  }, [loaded, walletProfiles]);

  useEffect(() => {
    if (!loaded || !web25BaseUrl) return;

    const nextProfileId = mode === 'create'
      ? createProfileId
      : selectedProfile?.id ?? '';

    if (nextProfileId) setRuntimeProfileId(nextProfileId);
    const expectedAddress = mode === 'create'
      ? address
      : selectedProfile?.walletAddress ?? null;
    void refreshSiweState(web25BaseUrl, expectedAddress);
  }, [address, createProfileId, loaded, mode, refreshSiweState, selectedProfile?.id, selectedProfile?.walletAddress, web25BaseUrl]);

  useEffect(() => {
    if (!loaded || mode !== 'select' || actionBusy || !selectedProfile?.walletAddress) return;

    const profileAddress = selectedProfile.walletAddress;
    if (!connectedAddress) {
      setStatus(`连接 ${formatAddress(profileAddress)} 后进入。`);
      return;
    }
    if (!sameAddress(profileAddress, connectedAddress)) {
      setStatus(`当前钱包 ${formatAddress(address)} 与所选 Profile ${formatAddress(profileAddress)} 不一致。`);
      return;
    }
    if (!isSepolia) {
      setStatus('钱包已匹配，点击 Profile 将切换到 Sepolia。');
      return;
    }
    if (!hasSiweForAddress(profileAddress)) {
      setStatus('钱包已匹配，点击 Profile 完成登录。');
      return;
    }
    setStatus('钱包与登录状态已匹配，点击 Profile 进入。');
  }, [
    actionBusy,
    address,
    connectedAddress,
    hasSiweForAddress,
    isSepolia,
    loaded,
    mode,
    selectedProfile?.walletAddress,
  ]);

  async function connectWallet() {
    setError(null);
    setStatus('选择钱包账户。');
    await open();
  }

  async function switchToSepolia() {
    setError(null);
    const provider = walletProvider as RequestingProvider | undefined;
    if (!provider) {
      await open();
      return false;
    }

    setBusy(true);
    setStatus('正在切换到 Sepolia。');
    try {
      await ensureWalletChain(provider, SIWE_CHAIN);
      setStatus('Sepolia 已启用。');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('无法切换到 Sepolia。');
      return false;
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
      // Metadata refresh should not block entering the app.
    }
  }

  async function performSiweLogin(targetAddress?: string, explicitProfileId?: string) {
    if (!targetAddress) {
      setStatus('先连接钱包。');
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
    setStatus('正在确认 Sepolia 网络。');
    try {
      const session = await loginWeb25WithSiwe({
        baseUrl: web25BaseUrl,
        walletProvider,
        expectedAddress: targetAddress,
        requiredChain: SIWE_CHAIN,
      });
      setSiweSession(session);
      if (explicitProfileId) await syncProfileMetadata(profileId);
      setStatus('登录完成。');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('登录失败，请确认钱包账户和后端地址。');
      return false;
    } finally {
      setSiweBusy(false);
    }
  }

  async function enterWalletProfile(profileAddress?: string, explicitProfileId?: string) {
    const targetAddress = profileAddress ?? siweSession?.address ?? address;
    if (!targetAddress) return;
    if (!walletProvider) {
      await open();
      return;
    }
    if (!sameAddress(connectedAddress, targetAddress)) {
      setStatus(`当前钱包 ${formatAddress(address)} 与目标 Profile ${formatAddress(targetAddress)} 不一致。`);
      return;
    }
    const networkReady = await switchToSepolia();
    if (!networkReady) {
      return;
    }
    if (!hasSiweForAddress(targetAddress)) {
      setStatus('请先登录。');
      return;
    }

    const profileId = resolveProfileId(targetAddress, explicitProfileId);
    if (profileId) setRuntimeProfileId(profileId);

    setBusy(true);
    setError(null);
    setStatus('正在进入。');
    try {
      await profileContext.enterWalletProfile({
        address: targetAddress,
        chainId: REQUIRED_CHAIN_ID,
      });
      await syncProfileMetadata(profileId);
      setStatus('已进入。');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('请重新确认钱包、网络和登录状态。');
    } finally {
      setBusy(false);
    }
  }

  async function useProfile(profile: ProfileSummary) {
    setSelectedProfileId(profile.id);
    setError(null);

    const profileAddress = profile.walletAddress;
    if (!profileAddress) return;

    setRuntimeProfileId(profile.id);

    const connectedToProfile = sameAddress(connectedAddress, profileAddress);
    if (!connectedToProfile) {
      setStatus(`请在钱包中切换到 ${formatAddress(profileAddress)}。`);
      await connectWallet();
      return;
    }
    if (!hasSiweForAddress(profileAddress)) {
      const ok = await performSiweLogin(profileAddress, profile.id);
      if (!ok) return;
    }
    await enterWalletProfile(profileAddress, profile.id);
  }

  async function useCurrentWalletProfile() {
    if (!isConnected || !address) {
      await connectWallet();
      return;
    }
    if (!createSiweReady) {
      const ok = await performSiweLogin(address);
      if (!ok) return;
    }
    await enterWalletProfile(address);
  }

  const createPanel = (
    <section className={styles.createScreen}>
      <button
        type="button"
        className={styles.backButton}
        onClick={() => {
          setMode('select');
          setError(null);
          setStatus(walletProfiles.length ? '选择要进入的 Profile。' : '还没有 Profile，点击加号创建。');
        }}
        disabled={actionBusy}
      >
        返回
      </button>

      <div className={styles.createCard}>
        <div className={styles.createHeader}>
          <div className={styles.profileAvatarLarge}>{address ? address.slice(2, 4).toUpperCase() : '+'}</div>
          <div>
            <h1>新建 Profile</h1>
            <p>{address ? formatAddress(address) : '连接钱包后创建本地身份'}</p>
          </div>
        </div>

        <div className={styles.stepRow}>
          <button type="button" className={styles.stepPill} onClick={connectWallet} disabled={actionBusy}>
            <span className={isConnected ? styles.stepDone : styles.stepIndex}>1</span>
            <strong>{isConnected ? '已连接' : '连接钱包'}</strong>
          </button>

          <button type="button" className={styles.stepPill} onClick={switchToSepolia} disabled={actionBusy || !isConnected || isSepolia}>
            <span className={isSepolia ? styles.stepDone : styles.stepIndex}>2</span>
            <strong>{isSepolia ? 'Sepolia' : '切换网络'}</strong>
          </button>

          <button
            type="button"
            className={styles.stepPill}
            onClick={() => {
              void performSiweLogin(address);
            }}
            disabled={actionBusy || !isConnected || !address}
          >
            <span className={createSiweReady ? styles.stepDone : styles.stepIndex}>3</span>
            <strong>{createSiweReady ? '已登录' : '登录'}</strong>
          </button>
        </div>

        <button type="button" className={styles.primaryAction} onClick={() => void useCurrentWalletProfile()} disabled={actionBusy}>
          {actionBusy ? '处理中' : createActionLabel}
        </button>
      </div>
    </section>
  );

  const selectorPanel = (
    <section className={styles.selectScreen}>
      <div className={styles.hero}>
        <p>FreeFlow</p>
        <h1>选择 Profile</h1>
      </div>

      <div className={styles.profileShelf} aria-label="Profile 列表">
        {walletProfiles.map((profile) => (
          <button
            type="button"
            key={profile.id}
            className={`${styles.profileTile} ${selectedProfileId === profile.id ? styles.profileTileActive : ''}`}
            onClick={() => void useProfile(profile)}
            disabled={actionBusy}
          >
            <div className={styles.profileAvatar}>
              {profile.web25AvatarUrl ? (
                <img src={profile.web25AvatarUrl} alt={profile.web25DisplayName || profile.name} />
              ) : (
                <span>{avatarLabel(profile)}</span>
              )}
            </div>
            <strong>{profile.web25DisplayName || formatAddress(profile.walletAddress)}</strong>
            <small>{formatAddress(profile.walletAddress)}</small>
          </button>
        ))}

        <button
          type="button"
          className={`${styles.profileTile} ${styles.addTile}`}
          onClick={() => {
            setMode('create');
            setSelectedProfileId('');
            setError(null);
            setStatus('连接钱包并登录。');
          }}
          disabled={actionBusy}
          aria-label="新建 Profile"
        >
          <div className={styles.profileAvatar}>
            <span>+</span>
          </div>
          <strong>新建</strong>
          <small>添加 Profile</small>
        </button>
      </div>
    </section>
  );

  return (
    <main className={styles.window}>
      <WindowChrome />
      <div className={styles.content}>
        {!loaded ? (
          <section className={styles.loadingScreen}>
            <div className={styles.loadingMark}>FF</div>
            <p>正在读取 Profile</p>
          </section>
        ) : mode === 'create' ? createPanel : selectorPanel}
        <p className={styles.status}>{status}</p>
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </main>
  );
}
