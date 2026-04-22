import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWeb3Modal } from '@web3modal/ethers/react';
import { profileContext, windowControlContext } from '@renderer/core/electronContextApi';
import { getRuntimeProfileId, setRuntimeProfileId } from '@renderer/core/profile/runtimeProfile';
import {
  formatShortAddress,
  getWalletAddress,
  sameAddress,
} from '@renderer/core/profile/profileIdentity';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import {
  ensureWalletChain,
  type RequestingProvider,
  type WalletChainConfig,
} from '@renderer/core/web3/walletNetwork';
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

function isMacPlatform(): boolean {
  return navigator.platform.toLowerCase().includes('mac');
}

function avatarLabel(profile?: ProfileSummary | null, address?: string | null): string {
  const walletAddress = profile?.walletAddress ?? address;
  if (walletAddress) return walletAddress.slice(2, 4).toUpperCase();
  if (profile?.name) return profile.name.slice(0, 2).toUpperCase();
  return 'FF';
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
  return DEFAULT_WEB25_BASE_URL;
}

function profileTitle(profile?: ProfileSummary | null): string {
  if (!profile) return '未选择身份';
  return profile.web25DisplayName || (profile.walletAddress ? formatAddress(profile.walletAddress) : profile.name);
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
          <div className={styles.chromeTitle}>FreeFlow</div>
          <div />
        </div>
    );
  }

  return (
      <div className={styles.chrome}>
        <div className={styles.chromeTitle}>FreeFlow</div>
        <div className={styles.winControls}>
          <button type="button" aria-label="最小化" onClick={() => windowControlContext.minimize()}>-</button>
          <button type="button" aria-label="最大化" onClick={() => windowControlContext.maximize()}>□</button>
          <button type="button" aria-label="关闭" onClick={() => windowControlContext.close()}>×</button>
        </div>
      </div>
  );
}

function Avatar({
                  profile,
                  address,
                  large = false,
                }: {
  profile?: ProfileSummary | null;
  address?: string | null;
  large?: boolean;
}) {
  const className = large ? styles.heroAvatar : styles.profileAvatar;
  const label = avatarLabel(profile, address);

  if (profile?.web25AvatarUrl) {
    return (
        <div className={className}>
          <img src={profile.web25AvatarUrl} alt={profile.web25DisplayName || profile.name} />
        </div>
    );
  }

  return (
      <div className={className}>
        <span>{label}</span>
      </div>
  );
}

export default function ProfileGuide() {
  const { open } = useWeb3Modal();
  const { address, chainId, isConnected, walletProvider } = useWalletRuntimeState();

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

  const hasSiweForAddress = useCallback((targetAddress?: string | null) => {
    if (!targetAddress || !siweSession) return false;
    return siweSession.chainId === REQUIRED_CHAIN_ID
        && siweSession.address.toLowerCase() === targetAddress.toLowerCase();
  }, [siweSession]);

  const createSiweReady = hasSiweForAddress(address);

  const currentStageText = useMemo(() => {
    if (!isConnected || !connectedAddress) return '连接钱包';
    if (!isSepolia) return '切换网络';
    if (!hasSiweForAddress(mode === 'create' ? address : selectedProfile?.walletAddress ?? connectedAddress)) {
      return '登录';
    }
    return '进入';
  }, [address, connectedAddress, hasSiweForAddress, isConnected, isSepolia, mode, selectedProfile?.walletAddress]);

  const heroProfile = mode === 'create'
      ? currentWalletProfile ?? null
      : selectedProfile ?? walletProfiles[0] ?? null;

  const heroName = useMemo(() => {
    if (!loaded) return '正在读取 Profile';
    if (mode === 'create') {
      if (currentWalletProfile) return profileTitle(currentWalletProfile);
      if (address) return formatAddress(address);
      return '新建 Profile';
    }
    if (walletProfiles.length === 0) return '还没有 Profile';
    return profileTitle(heroProfile);
  }, [address, currentWalletProfile, heroProfile, loaded, mode, walletProfiles.length]);

  const heroHeadline = useMemo(() => {
    if (!loaded) return '正在载入';
    if (mode === 'create') {
      if (!isConnected || !address) return '连接钱包后继续';
      if (!isSepolia) return '切换到 Sepolia';
      if (!createSiweReady) return '登录以继续';
      return currentWalletProfile ? '进入已有身份' : '创建并进入';
    }
    if (!walletProfiles.length) return '创建你的第一个身份';
    if (!selectedProfile?.walletAddress) return '选择一个身份';
    if (!connectedAddress) return '连接对应钱包';
    if (!sameAddress(selectedProfile.walletAddress, connectedAddress)) return '切换到对应钱包';
    if (!isSepolia) return '切换到 Sepolia';
    if (!hasSiweForAddress(selectedProfile.walletAddress)) return '登录以继续';
    return '欢迎回来';
  }, [
    address,
    connectedAddress,
    createSiweReady,
    currentWalletProfile,
    hasSiweForAddress,
    isConnected,
    isSepolia,
    loaded,
    mode,
    selectedProfile?.walletAddress,
    walletProfiles.length,
  ]);

  const heroDescription = useMemo(() => {
    if (mode === 'create') {
      if (!address) return '使用当前钱包地址创建或进入本地身份。';
      return `当前地址 ${formatAddress(address)} 将作为身份入口。`;
    }
    if (!walletProfiles.length) return '你还没有可用身份，先新建一个。';
    if (!selectedProfile?.walletAddress) return '从下方列表里选择一个身份。';
    return `将使用 ${formatAddress(selectedProfile.walletAddress)} 进入主界面。`;
  }, [address, mode, selectedProfile?.walletAddress, walletProfiles.length]);

  const heroMeta = useMemo(() => {
    const wallet = connectedAddress ? formatAddress(connectedAddress) : '未连接';
    const network = connectedAddress ? (isSepolia ? 'Sepolia' : '需切换') : '未就绪';

    let login = '未登录';
    if (mode === 'create') {
      login = address && hasSiweForAddress(address) ? '已登录' : '未登录';
    } else if (selectedProfile?.walletAddress) {
      login = hasSiweForAddress(selectedProfile.walletAddress) ? '已登录' : '未登录';
    }

    return { wallet, network, login };
  }, [address, connectedAddress, hasSiweForAddress, isSepolia, mode, selectedProfile?.walletAddress]);

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
        setStatus(initialWalletProfile ? '选择并进入你的身份。' : '还没有 Profile，请先新建。');

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
  }, [
    address,
    createProfileId,
    loaded,
    mode,
    refreshSiweState,
    selectedProfile?.id,
    selectedProfile?.walletAddress,
    web25BaseUrl,
  ]);

  useEffect(() => {
    if (!loaded || mode !== 'select' || actionBusy || !selectedProfile?.walletAddress) return;

    const profileAddress = selectedProfile.walletAddress;

    if (!connectedAddress) {
      setStatus(`连接 ${formatAddress(profileAddress)} 后进入。`);
      return;
    }
    if (!sameAddress(profileAddress, connectedAddress)) {
      setStatus(`当前钱包 ${formatAddress(connectedAddress)} 与所选身份不一致。`);
      return;
    }
    if (!isSepolia) {
      setStatus('钱包已匹配，继续切换到 Sepolia。');
      return;
    }
    if (!hasSiweForAddress(profileAddress)) {
      setStatus('钱包已匹配，继续完成登录。');
      return;
    }
    setStatus('状态已就绪，可以进入。');
  }, [
    actionBusy,
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
    setStatus('正在确认登录。');

    try {
      const session = await loginWeb25WithSiwe({
        baseUrl: web25BaseUrl,
        walletProvider,
        expectedAddress: targetAddress,
        requiredChain: SIWE_CHAIN,
      });

      setSiweSession(session);

      if (explicitProfileId) {
        await syncProfileMetadata(profileId);
      }

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
      setStatus(`当前钱包与目标身份 ${formatAddress(targetAddress)} 不一致。`);
      return;
    }

    const networkReady = await switchToSepolia();
    if (!networkReady) return;

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

  function selectProfile(profile: ProfileSummary) {
    setMode('select');
    setSelectedProfileId(profile.id);
    setRuntimeProfileId(profile.id);
    setError(null);
  }

  function handlePrimaryAction() {
    if (mode === 'create') {
      void useCurrentWalletProfile();
      return;
    }

    if (!selectedProfile && walletProfiles.length === 0) {
      setMode('create');
      setStatus('连接钱包并登录。');
      return;
    }

    if (selectedProfile) {
      void useProfile(selectedProfile);
    }
  }

  return (
      <main className={styles.window}>
        <WindowChrome />

        <div className={styles.scene}>
          <div className={styles.backdrop} />
          <div className={styles.backdropOverlay} />

          {!loaded ? (
              <section className={styles.panel}>
                <header className={styles.panelHeader}>
                  <div className={styles.brand}>
                    <div className={styles.brandMark}>
                      <span className={styles.brandDot} />
                    </div>
                    <span className={styles.brandText}>FREEFLOW</span>
                  </div>
                </header>

                <div className={styles.hero}>
                  <div className={styles.loadingAvatar}>FF</div>
                  <p className={styles.kicker}>Identity Launcher</p>
                  <h1 className={styles.title}>正在读取 Profile</h1>
                  <p className={styles.subtitle}>加载本地身份、钱包状态与登录上下文。</p>
                </div>
              </section>
          ) : (
              <section className={styles.panel}>
                <header className={styles.panelHeader}>
                  <div className={styles.brand}>
                    <div className={styles.brandMark}>
                      <span className={styles.brandDot} />
                    </div>
                    <span className={styles.brandText}>FREEFLOW</span>
                  </div>

                  {mode === 'select' && walletProfiles.length > 0 ? (
                      <button
                          type="button"
                          className={styles.headerAction}
                          onClick={() => {
                            setMode('create');
                            setSelectedProfileId('');
                            setError(null);
                            setStatus('连接钱包并登录。');
                          }}
                          disabled={actionBusy}
                      >
                        新建
                      </button>
                  ) : (
                      <button
                          type="button"
                          className={styles.headerAction}
                          onClick={() => {
                            setMode('select');
                            setError(null);
                            setStatus(walletProfiles.length ? '选择并进入你的身份。' : '还没有 Profile，请先新建。');
                          }}
                          disabled={actionBusy}
                      >
                        {walletProfiles.length ? '返回' : '列表'}
                      </button>
                  )}
                </header>

                <div className={styles.hero}>
                  <Avatar profile={heroProfile} address={address} large />
                  <p className={styles.kicker}>
                    {mode === 'create' ? 'Create Profile' : 'Welcome Back'}
                  </p>
                  <h1 className={styles.title}>{heroHeadline}</h1>
                  <p className={styles.subtitle}>{heroDescription}</p>
                  <strong className={styles.identityName}>{heroName}</strong>

                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>钱包 {heroMeta.wallet}</span>
                    <span className={styles.metaDivider} />
                    <span className={styles.metaItem}>网络 {heroMeta.network}</span>
                    <span className={styles.metaDivider} />
                    <span className={styles.metaItem}>登录 {heroMeta.login}</span>
                  </div>
                </div>

                {mode === 'select' ? (
                    <div className={styles.selectorArea}>
                      {walletProfiles.length > 0 ? (
                          <div className={styles.profileList} aria-label="Profile 列表">
                            {walletProfiles.map((profile) => {
                              const active = profile.id === selectedProfileId;
                              return (
                                  <button
                                      type="button"
                                      key={profile.id}
                                      className={`${styles.profileRow} ${active ? styles.profileRowActive : ''}`}
                                      onClick={() => selectProfile(profile)}
                                      disabled={actionBusy}
                                  >
                                    <Avatar profile={profile} />
                                    <span className={styles.profileRowText}>
                            <strong>{profileTitle(profile)}</strong>
                            <small>{profile.walletAddress ? formatAddress(profile.walletAddress) : 'Wallet Profile'}</small>
                          </span>
                                  </button>
                              );
                            })}
                          </div>
                      ) : (
                          <div className={styles.emptyState}>
                            还没有可用身份，先创建一个新的 Profile。
                          </div>
                      )}

                      <button
                          type="button"
                          className={styles.primaryAction}
                          onClick={handlePrimaryAction}
                          disabled={actionBusy || (!selectedProfile && walletProfiles.length > 0)}
                      >
                        {actionBusy ? '处理中…' : walletProfiles.length ? currentStageText : '新建 Profile'}
                      </button>
                    </div>
                ) : (
                    <div className={styles.createArea}>
                      <div className={styles.stepList}>
                        <button
                            type="button"
                            className={styles.stepRow}
                            onClick={() => {
                              void connectWallet();
                            }}
                            disabled={actionBusy}
                        >
                          <span className={styles.stepIndex}>{isConnected ? '✓' : '1'}</span>
                          <span className={styles.stepCopy}>
                      <strong>{isConnected ? '钱包已连接' : '连接钱包'}</strong>
                      <small>选择外部钱包账户</small>
                    </span>
                        </button>

                        <button
                            type="button"
                            className={styles.stepRow}
                            onClick={() => {
                              void switchToSepolia();
                            }}
                            disabled={actionBusy || !isConnected || isSepolia}
                        >
                          <span className={styles.stepIndex}>{isSepolia ? '✓' : '2'}</span>
                          <span className={styles.stepCopy}>
                      <strong>{isSepolia ? '网络已就绪' : '切换网络'}</strong>
                      <small>切换到 Sepolia</small>
                    </span>
                        </button>

                        <button
                            type="button"
                            className={styles.stepRow}
                            onClick={() => {
                              void performSiweLogin(address);
                            }}
                            disabled={actionBusy || !isConnected || !address}
                        >
                          <span className={styles.stepIndex}>{createSiweReady ? '✓' : '3'}</span>
                          <span className={styles.stepCopy}>
                      <strong>{createSiweReady ? '已登录' : '登录'}</strong>
                      <small>同步 Web2.5 会话</small>
                    </span>
                        </button>
                      </div>

                      <button
                          type="button"
                          className={styles.primaryAction}
                          onClick={handlePrimaryAction}
                          disabled={actionBusy}
                      >
                        {actionBusy ? '处理中…' : currentStageText}
                      </button>
                    </div>
                )}

                <footer className={styles.footer}>
                  <p className={styles.status}>{status}</p>
                  {error && <p className={styles.error}>{error}</p>}
                </footer>
              </section>
          )}
        </div>
      </main>
  );
}