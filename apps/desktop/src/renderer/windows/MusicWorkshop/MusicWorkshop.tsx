import React from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSettingsContext } from '@renderer/core/config/SettingsContext';
import {
  buildSiweMessage,
  createCreatorRelease,
  type CreatorReleaseDashboard,
  type CreatorReleaseRecord,
  type CreatorReleaseSplit,
  getPinataConfig,
  getWeb25Session,
  listCreatorReleases,
  logoutWeb25,
  type PinataConfigPayload,
  requestSiweNonce,
  updateCreatorRelease,
  uploadFileToWeb25Pinata,
  verifySiweSession,
  type Web25Session,
} from '@renderer/core/web25/client';
import { DEFAULT_SEPOLIA_CONTRACTS, PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import {
  type AccessCheckState,
  type AccessModel,
  type AutosaveState,
  buildMetadataDocument,
  type BusyState,
  DEFAULT_ACCESS_CHECK_STATE,
  defaultSplits,
  EMPTY_DASHBOARD,
  filteredReleases,
  formatBytes,
  formatRelativeTime,
  metadataUriForRelease,
  PANELS,
  RELEASE_FILTERS,
  type ReleaseFilter,
  type ReleasePanel,
  releaseStatusLabel,
  replaceReleaseInDashboard,
  slugify,
} from './workshopHelpers';
import styles from './MusicWorkshop.module.css';
import './MusicWorkshop.css';

function releaseTone(status: CreatorReleaseRecord['status']) {
  if (status === 'PUBLISHED') return styles.statusSuccess;
  if (status === 'FAILED') return styles.statusDanger;
  if (status === 'PUBLISHING' || status === 'ASSETS_PENDING') return styles.statusWarning;
  return styles.statusNeutral;
}

function updateSplit(
  splits: CreatorReleaseSplit[],
  index: number,
  patch: Partial<CreatorReleaseSplit>,
) {
  const next = [...splits];
  next[index] = { ...next[index], ...patch };
  return next;
}

export default function MusicWorkshop() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const { settings, setByPath } = useSettingsContext();

  const [dashboard, setDashboard] = React.useState<CreatorReleaseDashboard>(EMPTY_DASHBOARD);
  const [selectedRelease, setSelectedRelease] = React.useState<CreatorReleaseRecord | null>(null);
  const [releaseFilter, setReleaseFilter] = React.useState<ReleaseFilter>('all');
  const [activePanel, setActivePanel] = React.useState<ReleasePanel>('editor');
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = React.useState('');
  const [accessCheck, setAccessCheck] = React.useState<AccessCheckState>(DEFAULT_ACCESS_CHECK_STATE);
  const [busyState, setBusyState] = React.useState<BusyState>('idle');
  const [autosaveState, setAutosaveState] = React.useState<AutosaveState>('idle');
  const [authBusy, setAuthBusy] = React.useState(false);
  const [web25Session, setWeb25Session] = React.useState<Web25Session | null>(null);
  const [pinataConfig, setPinataConfig] = React.useState<PinataConfigPayload | null>(null);

  const skipAutosaveRef = React.useRef(false);
  const web25BackendBaseUrl = settings?.services.web25Backend.baseUrl?.trim() || 'http://localhost:8787';
  const web3Settings = settings?.services.web3Publishing;
  const effectiveWeb3Settings = React.useMemo(() => ({
    chainId: web3Settings?.chainId || DEFAULT_SEPOLIA_CONTRACTS.chainId,
    chainName: web3Settings?.chainName || DEFAULT_SEPOLIA_CONTRACTS.chainName,
    explorerUrl: web3Settings?.explorerUrl || DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
    musicAssetAddress: web3Settings?.musicAssetAddress || DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress,
    royaltySplitterFactoryAddress: web3Settings?.royaltySplitterFactoryAddress || DEFAULT_SEPOLIA_CONTRACTS.royaltySplitterFactoryAddress,
    platformHubAddress: web3Settings?.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress,
    defaultRoyaltyBps: web3Settings?.defaultRoyaltyBps || DEFAULT_SEPOLIA_CONTRACTS.defaultRoyaltyBps,
    platformFeeBps: web3Settings?.platformFeeBps || DEFAULT_SEPOLIA_CONTRACTS.platformFeeBps,
  }), [web3Settings]);

  React.useEffect(() => {
    const preview = coverFile ? URL.createObjectURL(coverFile) : (selectedRelease?.coverStorageObject?.gatewayUrl || '');
    setCoverPreviewUrl(preview);
    if (!coverFile || !preview.startsWith('blob:')) return undefined;
    return () => URL.revokeObjectURL(preview);
  }, [coverFile, selectedRelease?.coverStorageObject?.gatewayUrl]);

  React.useEffect(() => {
    setAudioFile(null);
    setCoverFile(null);
    setAccessCheck((prev) => ({ ...DEFAULT_ACCESS_CHECK_STATE, tokenId: selectedRelease?.tokenId || prev.tokenId }));
    if (selectedRelease) setActivePanel((selectedRelease.currentStage as ReleasePanel) || 'editor');
  }, [selectedRelease?.id]);

  const applyServerRelease = React.useCallback((release: CreatorReleaseRecord) => {
    skipAutosaveRef.current = true;
    setSelectedRelease(release);
    setDashboard((prev) => replaceReleaseInDashboard(prev, release));
  }, []);

  const refreshWeb25State = React.useCallback(async () => {
    if (!web25BackendBaseUrl) return;
    try {
      const [sessionPayload, pinataPayload] = await Promise.all([
        getWeb25Session(web25BackendBaseUrl),
        getPinataConfig(web25BackendBaseUrl),
      ]);
      setWeb25Session(sessionPayload.session);
      setPinataConfig(pinataPayload);
    } catch {
      setWeb25Session(null);
      setPinataConfig(null);
    }
  }, [web25BackendBaseUrl]);

  const refreshDashboard = React.useCallback(async (preferredReleaseId?: string | null) => {
    if (!web25Session || !web25BackendBaseUrl) {
      setDashboard(EMPTY_DASHBOARD);
      setSelectedRelease(null);
      return;
    }

    setBusyState('loading-dashboard');
    try {
      const payload = await listCreatorReleases(web25BackendBaseUrl);
      setDashboard(payload);
      const next = payload.releases.find((item) => item.id === preferredReleaseId)
        ?? payload.releases.find((item) => item.id === selectedRelease?.id)
        ?? payload.releases[0]
        ?? null;
      skipAutosaveRef.current = true;
      setSelectedRelease(next);
    } finally {
      setBusyState('idle');
    }
  }, [selectedRelease?.id, web25BackendBaseUrl, web25Session]);

  React.useEffect(() => {
    void refreshWeb25State();
  }, [refreshWeb25State]);
  React.useEffect(() => {
    if (!web25Session) {
      setDashboard(EMPTY_DASHBOARD);
      setSelectedRelease(null);
      return;
    }
    void refreshDashboard();
  }, [refreshDashboard, web25Session]);

  const metadataDocument = React.useMemo(
    () => selectedRelease
      ? buildMetadataDocument(selectedRelease, {
        pinataConfig,
        chainName: effectiveWeb3Settings.chainName,
        platformHubAddress: effectiveWeb3Settings.platformHubAddress,
        musicAssetAddress: effectiveWeb3Settings.musicAssetAddress,
        audioMimeType: audioFile?.type,
        coverMimeType: coverFile?.type,
      })
      : null,
    [audioFile?.type, coverFile?.type, effectiveWeb3Settings.chainName, effectiveWeb3Settings.musicAssetAddress, effectiveWeb3Settings.platformHubAddress, pinataConfig, selectedRelease],
  );

  const autosavePayload = React.useMemo(() => {
    if (!selectedRelease) return null;
    return {
      title: selectedRelease.title,
      artistName: selectedRelease.artistName,
      albumName: selectedRelease.albumName,
      genreLabel: selectedRelease.genreLabel,
      slug: selectedRelease.slug || slugify(selectedRelease.title),
      description: selectedRelease.description,
      currentStage: activePanel,
      accessModel: selectedRelease.accessModel,
      previewSeconds: selectedRelease.previewSeconds,
      priceEth: selectedRelease.priceEth,
      royaltyBps: selectedRelease.royaltyBps,
      audioSourceName: selectedRelease.audioSourceName,
      audioSourcePath: selectedRelease.audioSourcePath,
      coverSourceName: selectedRelease.coverSourceName,
      coverSourcePath: selectedRelease.coverSourcePath,
      audioStorageObjectId: selectedRelease.audioStorageObjectId,
      coverStorageObjectId: selectedRelease.coverStorageObjectId,
      metadataStorageObjectId: selectedRelease.metadataStorageObjectId,
      splitterAddress: selectedRelease.splitterAddress,
      publishTxHash: selectedRelease.publishTxHash,
      purchaseTxHash: selectedRelease.purchaseTxHash,
      tokenId: selectedRelease.tokenId,
      chainId: effectiveWeb3Settings.chainId,
      chainName: effectiveWeb3Settings.chainName,
      explorerUrl: effectiveWeb3Settings.explorerUrl,
      musicAssetAddress: effectiveWeb3Settings.musicAssetAddress,
      royaltySplitterFactoryAddress: effectiveWeb3Settings.royaltySplitterFactoryAddress,
      platformHubAddress: effectiveWeb3Settings.platformHubAddress,
      royaltySplits: selectedRelease.royaltySplits,
      metadataDocument,
      latestError: selectedRelease.latestError,
      statusMessage: selectedRelease.statusMessage,
    };
  }, [activePanel, effectiveWeb3Settings, metadataDocument, selectedRelease]);

  React.useEffect(() => {
    if (!selectedRelease || !web25Session || !autosavePayload || !web25BackendBaseUrl) return undefined;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        setAutosaveState('saving');
        const updated = await updateCreatorRelease(web25BackendBaseUrl, selectedRelease.id, autosavePayload);
        applyServerRelease(updated);
        setAutosaveState('saved');
      } catch {
        setAutosaveState('error');
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [applyServerRelease, autosavePayload, selectedRelease, web25BackendBaseUrl, web25Session]);

  const patchRelease = React.useCallback(async (patch: Record<string, unknown>) => {
    if (!selectedRelease || !web25BackendBaseUrl) throw new Error('No active release');
    const updated = await updateCreatorRelease(web25BackendBaseUrl, selectedRelease.id, patch);
    applyServerRelease(updated);
    return updated;
  }, [applyServerRelease, selectedRelease, web25BackendBaseUrl]);

  const updateLocal = React.useCallback((patch: Partial<CreatorReleaseRecord>) => {
    setSelectedRelease((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleCreateRelease = async () => {
    if (!web25Session) return;
    const created = await createCreatorRelease(web25BackendBaseUrl, {
      artistName: address || undefined,
      accessModel: 'purchase',
    });
    applyServerRelease({
      ...created,
      royaltySplits: created.royaltySplits.length ? created.royaltySplits : defaultSplits(address),
    });
  };

  const handleSiweLogin = async () => {
    if (!walletProvider || !web25BackendBaseUrl) return;
    setAuthBusy(true);
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const signerAddress = address || await signer.getAddress();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      const noncePayload = await requestSiweNonce(web25BackendBaseUrl, { address: signerAddress, chainId });
      const message = buildSiweMessage({
        domain: noncePayload.domain,
        address: signerAddress,
        uri: noncePayload.uri,
        statement: noncePayload.statement,
        version: noncePayload.version,
        chainId,
        nonce: noncePayload.nonce,
        issuedAt: new Date().toISOString(),
      });
      const signature = await signer.signMessage(message);
      const verified = await verifySiweSession(web25BackendBaseUrl, { message, signature });
      setWeb25Session(verified.session);
      await refreshDashboard();
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSiweLogout = async () => {
    if (!web25BackendBaseUrl) return;
    setAuthBusy(true);
    try {
      await logoutWeb25(web25BackendBaseUrl);
      setWeb25Session(null);
      setDashboard(EMPTY_DASHBOARD);
      setSelectedRelease(null);
    } finally {
      setAuthBusy(false);
    }
  };

  const hydrateMetadataFromFile = React.useCallback(async (file: File) => {
    const path = (file as File & { path?: string }).path;
    if (!path) return { title: file.name.replace(/\.[^.]+$/, ''), artist: '', album: '', genre: '' };
    const metadata = await window.mainApi.creatorsWorkshopApi.readMetadata(path);
    return {
      title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
      artist: metadata.artist || '',
      album: metadata.album || '',
      genre: Array.isArray(metadata.genre) ? metadata.genre.join(', ') : (metadata.genre || ''),
    };
  }, []);

  const onAudioSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRelease) return;
    setAudioFile(file);
    const metadata = await hydrateMetadataFromFile(file);
    updateLocal({
      audioSourceName: file.name,
      audioSourcePath: (file as File & { path?: string }).path || null,
      title: selectedRelease.title || metadata.title,
      slug: slugify(selectedRelease.title || metadata.title),
      artistName: selectedRelease.artistName || metadata.artist,
      albumName: selectedRelease.albumName || metadata.album,
      genreLabel: selectedRelease.genreLabel || metadata.genre,
      statusMessage: `已挂载音频 ${file.name}`,
    });
  };

  const onCoverSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    updateLocal({
      coverSourceName: file.name,
      coverSourcePath: (file as File & { path?: string }).path || null,
      statusMessage: `已挂载封面 ${file.name}`,
    });
  };

  const normalizeSplits = React.useCallback((fallbackAddress: string) => {
    const source = selectedRelease?.royaltySplits.length ? selectedRelease.royaltySplits : defaultSplits(fallbackAddress);
    const normalized = source
      .map((item) => ({ ...item, address: item.address.trim(), share: Number(item.share || 0) }))
      .filter((item) => item.address && item.share > 0);
    return normalized.length ? normalized : defaultSplits(fallbackAddress);
  }, [selectedRelease?.royaltySplits]);

  const handleUploadAssets = async () => {
    if (!selectedRelease || !web25Session || (!audioFile && !selectedRelease.audioStorageObjectId)) return;
    setBusyState('uploading-assets');
    try {
      await patchRelease({
        status: 'ASSETS_PENDING',
        currentStage: 'storage',
        latestError: null,
        activityEntry: { message: 'Started asset upload', level: 'info' },
      });
      let coverStorageObjectId = selectedRelease.coverStorageObjectId;
      if (coverFile) {
        const result = await uploadFileToWeb25Pinata(web25BackendBaseUrl, {
          file: coverFile,
          name: `${slugify(selectedRelease.title || coverFile.name)}-cover`,
          keyvalues: { kind: 'cover', releaseId: selectedRelease.id, artist: selectedRelease.artistName || 'unknown' },
        });
        coverStorageObjectId = result.storageObjectId;
      }
      let audioStorageObjectId = selectedRelease.audioStorageObjectId;
      if (audioFile) {
        const result = await uploadFileToWeb25Pinata(web25BackendBaseUrl, {
          file: audioFile,
          name: `${slugify(selectedRelease.title || audioFile.name)}-audio`,
          keyvalues: { kind: 'audio', releaseId: selectedRelease.id, artist: selectedRelease.artistName || 'unknown' },
        });
        audioStorageObjectId = result.storageObjectId;
      }
      await patchRelease({
        status: 'ASSETS_UPLOADED',
        currentStage: 'storage',
        audioStorageObjectId,
        coverStorageObjectId,
        audioSourceName: audioFile?.name || selectedRelease.audioSourceName,
        audioSourcePath: (audioFile as (File & { path?: string }) | null)?.path || selectedRelease.audioSourcePath,
        coverSourceName: coverFile?.name || selectedRelease.coverSourceName,
        coverSourcePath: (coverFile as (File & { path?: string }) | null)?.path || selectedRelease.coverSourcePath,
        latestError: null,
        statusMessage: '音频与封面已上传到 Pinata',
        activityEntry: { message: 'Assets uploaded', level: 'success' },
      });
    } catch (error) {
      await patchRelease({
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: '素材上传失败',
        activityEntry: {
          message: `Asset upload failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      }).catch((): void => {
      });
    } finally {
      setBusyState('idle');
    }
  };

  const handleUploadMetadata = async () => {
    if (!selectedRelease || !metadataDocument || !selectedRelease.audioStorageObjectId) return;
    setBusyState('uploading-metadata');
    try {
      const metadataFile = new File(
        [JSON.stringify(metadataDocument, null, 2)],
        `${slugify(selectedRelease.title || 'untitled-track')}-metadata.json`,
        { type: 'application/json' },
      );
      const result = await uploadFileToWeb25Pinata(web25BackendBaseUrl, {
        file: metadataFile,
        name: `${slugify(selectedRelease.title || 'untitled-track')}-metadata`,
        keyvalues: { kind: 'metadata', releaseId: selectedRelease.id, artist: selectedRelease.artistName || 'unknown' },
      });
      await patchRelease({
        status: 'METADATA_UPLOADED',
        currentStage: 'publish',
        metadataStorageObjectId: result.storageObjectId,
        metadataDocument,
        latestError: null,
        statusMessage: 'Metadata 已上传',
        activityEntry: { message: `Metadata uploaded: ${result.cid}`, level: 'success' },
      });
      setActivePanel('publish');
    } catch (error) {
      await patchRelease({
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: 'Metadata 上传失败',
        activityEntry: {
          message: `Metadata upload failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      }).catch((): void => {
      });
    } finally {
      setBusyState('idle');
    }
  };

  const handlePublish = async () => {
    if (!selectedRelease || !walletProvider || !selectedRelease.metadataStorageObject || !effectiveWeb3Settings.platformHubAddress) return;
    const metadataUri = metadataUriForRelease(selectedRelease);
    if (!metadataUri) return;
    setBusyState('publishing');
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const artistAddress = address || await signer.getAddress();
      const splits = normalizeSplits(artistAddress);
      const requiresPurchase = selectedRelease.accessModel === 'purchase';
      const priceWei = requiresPurchase ? parseEther(selectedRelease.priceEth || '0') : BigInt(0);
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);

      await patchRelease({
        status: 'PUBLISHING',
        currentStage: 'publish',
        latestError: null,
        chainId: effectiveWeb3Settings.chainId,
        chainName: effectiveWeb3Settings.chainName,
        explorerUrl: effectiveWeb3Settings.explorerUrl,
        musicAssetAddress: effectiveWeb3Settings.musicAssetAddress,
        royaltySplitterFactoryAddress: effectiveWeb3Settings.royaltySplitterFactoryAddress,
        platformHubAddress: effectiveWeb3Settings.platformHubAddress,
        royaltySplits: splits,
        activityEntry: { message: 'Waiting for wallet confirmation', level: 'info' },
      });

      const [predictedTokenId, predictedSplitter] = await platformHub.publishTrack.staticCall(
        metadataUri,
        selectedRelease.royaltyBps,
        requiresPurchase,
        priceWei,
        true,
        splits.map((item) => item.address),
        splits.map((item) => item.share),
      );
      const publishTx = await platformHub.publishTrack(
        metadataUri,
        selectedRelease.royaltyBps,
        requiresPurchase,
        priceWei,
        true,
        splits.map((item) => item.address),
        splits.map((item) => item.share),
      );
      await patchRelease({
        status: 'PUBLISHING',
        publishTxHash: publishTx.hash,
        statusMessage: '链上交易已发出，等待确认',
        activityEntry: { message: `Publish tx submitted: ${publishTx.hash}`, level: 'info' },
      });
      await publishTx.wait();
      const tokenId = predictedTokenId.toString();
      await patchRelease({
        status: 'PUBLISHED',
        currentStage: 'access',
        splitterAddress: predictedSplitter,
        publishTxHash: publishTx.hash,
        tokenId,
        latestError: null,
        statusMessage: `作品已发布：Token #${tokenId}`,
        activityEntry: { message: `Published token #${tokenId}`, level: 'success' },
      });
      setAccessCheck((prev) => ({
        ...prev,
        tokenId,
        creator: artistAddress,
        payoutReceiver: predictedSplitter,
        priceEth: requiresPurchase ? selectedRelease.priceEth : '0',
        requiresPurchase,
        active: true,
        hasAccess: requiresPurchase ? null : true,
        lastUpdated: '已根据发布结果预填作品编号',
      }));
      setActivePanel('access');
    } catch (error) {
      await patchRelease({
        status: 'FAILED',
        latestError: error instanceof Error ? error.message : String(error),
        statusMessage: '链上发布失败',
        activityEntry: {
          message: `Publish failed: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error',
        },
      }).catch((): void => {
      });
    } finally {
      setBusyState('idle');
    }
  };

  const handleRefreshAccess = async () => {
    if (!walletProvider || !selectedRelease?.tokenId || !effectiveWeb3Settings.platformHubAddress) return;
    setBusyState('checking-access');
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const currentAddress = address || await signer.getAddress();
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);
      const [creator, payoutReceiver, price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(selectedRelease.tokenId);
      const hasAccess = await platformHub.hasAccess(currentAddress, selectedRelease.tokenId);
      const [, platformFee, creatorProceeds] = await platformHub.paymentPreview(selectedRelease.tokenId);
      setAccessCheck({
        tokenId: selectedRelease.tokenId,
        creator,
        payoutReceiver,
        priceEth: formatEther(price),
        requiresPurchase,
        active,
        hasAccess,
        platformFeeEth: formatEther(platformFee),
        creatorProceedsEth: formatEther(creatorProceeds),
        lastUpdated: `已查询 ${currentAddress.slice(0, 6)}... 的授权状态`,
      });
    } finally {
      setBusyState('idle');
    }
  };

  const handleBuyAccess = async () => {
    if (!walletProvider || !selectedRelease?.tokenId || !effectiveWeb3Settings.platformHubAddress) return;
    setBusyState('buying');
    try {
      const provider = new BrowserProvider(walletProvider);
      const signer = await provider.getSigner();
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);
      const [, , price, requiresPurchase] = await platformHub.getTrackSaleConfig(selectedRelease.tokenId);
      if (!requiresPurchase) return;
      const buyTx = await platformHub.buyAccess(selectedRelease.tokenId, { value: price });
      await buyTx.wait();
      await patchRelease({
        purchaseTxHash: buyTx.hash,
        statusMessage: `访问权购买成功：${buyTx.hash.slice(0, 10)}...`,
        activityEntry: { message: `Access purchased: ${buyTx.hash}`, level: 'success' },
      });
      await handleRefreshAccess();
    } finally {
      setBusyState('idle');
    }
  };

  const visibleReleases = React.useMemo(() => filteredReleases(dashboard.releases, releaseFilter), [dashboard.releases, releaseFilter]);
  const activeSplits = selectedRelease ? (selectedRelease.royaltySplits.length ? selectedRelease.royaltySplits : defaultSplits(address)) : [];
  const needsAudioReattach = !!selectedRelease?.audioSourceName && !audioFile && !selectedRelease.audioStorageObject;
  const needsCoverReattach = !!selectedRelease?.coverSourceName && !coverFile && !selectedRelease.coverStorageObject;

  const header = (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.title}>Creators Workshop</div>
        <div className={styles.subtitle}>服务器负责草稿、恢复、发布记录；链上和 IPFS 负责最终结果。</div>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.ghostButton} onClick={() => void refreshDashboard(selectedRelease?.id)}
                disabled={!web25Session || busyState !== 'idle'}>刷新
        </button>
        <button className={styles.primaryButton} onClick={() => void handleCreateRelease()}
                disabled={!web25Session}>新建项目
        </button>
        <button className={styles.ghostButton}
                onClick={() => (web25Session ? void handleSiweLogout() : void handleSiweLogin())} disabled={authBusy}>
          {authBusy ? '处理中…' : (web25Session ? '退出会话' : 'SIWE 登录')}
        </button>
        <button className={styles.walletButton} onClick={() => open()}>
          {isConnected ? `钱包 ${address?.slice(0, 6)}...` : '连接钱包'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.window}>
      <ViewShell header={header} padded={false} hideScrollbar className={styles.shell}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>概览</div>
              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>项目</div>
                  <div className={styles.metricValue}>{dashboard.summary.total}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>进行中</div>
                  <div className={styles.metricValue}>{dashboard.summary.inProgress}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>已发布</div>
                  <div className={styles.metricValue}>{dashboard.summary.published}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>失败</div>
                  <div className={styles.metricValue}>{dashboard.summary.failed}</div>
                </div>
              </div>
            </section>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>筛选</div>
              <div className={styles.filterRow}>
                {RELEASE_FILTERS.map((filter) => (
                  <button key={filter.value}
                          className={`${styles.filterButton} ${releaseFilter === filter.value ? styles.filterButtonActive : ''}`}
                          onClick={() => setReleaseFilter(filter.value)}>{filter.label}</button>
                ))}
              </div>
            </section>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>项目列表</div>
              {!web25Session && <div className={styles.emptyBody}>登录后可追踪发布流程和已发布内容。</div>}
              <div className={styles.releaseList}>
                {visibleReleases.map((release) => (
                  <button key={release.id}
                          className={`${styles.releaseCard} ${selectedRelease?.id === release.id ? styles.releaseCardActive : ''}`}
                          onClick={() => {
                            skipAutosaveRef.current = true;
                            setSelectedRelease(release);
                          }}>
                    <div className={styles.releaseCardTop}>
                      <div className={styles.releaseTitle}>{release.title || 'Untitled Draft'}</div>
                      <span
                        className={`${styles.statusBadge} ${releaseTone(release.status)}`}>{releaseStatusLabel(release.status)}</span>
                    </div>
                    <div className={styles.releaseMeta}>
                      <span>{release.artistName || 'Unknown artist'}</span><span>{formatRelativeTime(release.updatedAt)}</span>
                    </div>
                    <div className={styles.releaseMeta}>
                      <span>{release.tokenId ? `Token #${release.tokenId}` : '未上链'}</span><span>{release.metadataStorageObject ? 'Metadata 就绪' : 'Metadata 待生成'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </aside>
          <main className={styles.workspace}>
            {!selectedRelease && <section className={styles.emptyWorkspace}>
              <div className={styles.emptyTitle}>没有选中的项目</div>
              <div className={styles.emptyBody}>先完成 SIWE 登录，再创建或选择一个发布项目。</div>
            </section>}
            {selectedRelease && (
              <>
                <section className={styles.hero}>
                  <div className={styles.heroMain}>
                    <div className={styles.heroEyebrow}>当前项目</div>
                    <div className={styles.heroTitleRow}>
                      <h1 className={styles.heroTitle}>{selectedRelease.title || 'Untitled Draft'}</h1>
                      <span
                        className={`${styles.statusBadge} ${releaseTone(selectedRelease.status)}`}>{releaseStatusLabel(selectedRelease.status)}</span>
                    </div>
                    <div
                      className={styles.heroSub}>{selectedRelease.artistName || 'Unknown artist'} · {selectedRelease.accessModel === 'purchase' ? '购买后访问' : '公开访问'} ·
                      最近活动 {formatRelativeTime(selectedRelease.lastActivityAt)}</div>
                  </div>
                  <div className={styles.heroStats}>
                    <div className={styles.heroStat}>
                      <div className={styles.heroStatLabel}>自动保存</div>
                      <div
                        className={styles.heroStatValue}>{autosaveState === 'saving' ? '保存中' : autosaveState === 'error' ? '失败' : autosaveState === 'saved' ? '已同步' : '空闲'}</div>
                    </div>
                    <div className={styles.heroStat}>
                      <div className={styles.heroStatLabel}>最近动作</div>
                      <div className={styles.heroStatValue}>{selectedRelease.statusMessage || '继续编辑项目'}</div>
                    </div>
                  </div>
                </section>

                <div className={styles.panelTabs}>
                  {PANELS.map((panel) => (
                    <button key={panel.value}
                            className={`${styles.panelTab} ${activePanel === panel.value ? styles.panelTabActive : ''}`}
                            onClick={() => {
                              setActivePanel(panel.value);
                              updateLocal({ currentStage: panel.value });
                            }}>
                      {panel.label}
                    </button>
                  ))}
                </div>

                {activePanel === 'editor' && (
                  <div className={styles.panelGrid}>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>项目元信息</div>
                      <div className={styles.formGrid}>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>标题<input className={styles.input}
                                                                     value={selectedRelease.title}
                                                                     onChange={(e) => updateLocal({
                                                                       title: e.target.value,
                                                                       slug: slugify(e.target.value),
                                                                     })} /></label>
                          <label className={styles.label}>歌手<input className={styles.input}
                                                                     value={selectedRelease.artistName || ''}
                                                                     onChange={(e) => updateLocal({ artistName: e.target.value })} /></label>
                        </div>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>专辑<input className={styles.input}
                                                                     value={selectedRelease.albumName || ''}
                                                                     onChange={(e) => updateLocal({ albumName: e.target.value })} /></label>
                          <label className={styles.label}>流派<input className={styles.input}
                                                                     value={selectedRelease.genreLabel || ''}
                                                                     onChange={(e) => updateLocal({ genreLabel: e.target.value })} /></label>
                        </div>
                        <label className={styles.label}>描述<textarea className={styles.textarea}
                                                                      value={selectedRelease.description || ''}
                                                                      onChange={(e) => updateLocal({ description: e.target.value })} /></label>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>访问模式<select className={styles.select}
                                                                          value={selectedRelease.accessModel}
                                                                          onChange={(e) => updateLocal({ accessModel: e.target.value as AccessModel })}>
                            <option value="purchase">购买后完整获取</option>
                            <option value="open">公开可访问</option>
                          </select></label>
                          <label className={styles.label}>试听秒数<input className={styles.input} type="number"
                                                                         value={selectedRelease.previewSeconds}
                                                                         onChange={(e) => updateLocal({ previewSeconds: Number(e.target.value) || 0 })} /></label>
                        </div>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>价格 ETH<input className={styles.input}
                                                                         value={selectedRelease.priceEth}
                                                                         onChange={(e) => updateLocal({ priceEth: e.target.value })} /></label>
                          <label className={styles.label}>版税 BPS<input className={styles.input} type="number"
                                                                         value={selectedRelease.royaltyBps}
                                                                         onChange={(e) => updateLocal({ royaltyBps: Number(e.target.value) || 0 })} /></label>
                        </div>
                      </div>
                    </section>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>素材挂载</div>
                      <div className={styles.assetBox}>
                        <div className={styles.assetHeader}>
                          <div>
                            <div className={styles.assetTitle}>音频</div>
                            <div
                              className={styles.assetHint}>{selectedRelease.audioSourceName || audioFile?.name || '未选择'}</div>
                          </div>
                          <label className={styles.primaryButton}>选择音频<input hidden type="file"
                                                                                 accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a"
                                                                                 onChange={onAudioSelected} /></label>
                        </div>
                        <div className={styles.assetMetaRow}>
                          <span>{audioFile ? formatBytes(audioFile.size) : (selectedRelease.audioStorageObject ? formatBytes(selectedRelease.audioStorageObject.size) : '等待挂载')}</span><span>{audioFile?.type || selectedRelease.audioStorageObject?.mimeType || 'audio/*'}</span>
                        </div>
                      </div>
                      <div className={styles.assetBox}>
                        <div className={styles.assetHeader}>
                          <div>
                            <div className={styles.assetTitle}>封面</div>
                            <div
                              className={styles.assetHint}>{selectedRelease.coverSourceName || coverFile?.name || '未选择'}</div>
                          </div>
                          <label className={styles.ghostButton}>选择封面<input hidden type="file"
                                                                               accept="image/*,.png,.jpg,.jpeg,.webp"
                                                                               onChange={onCoverSelected} /></label>
                        </div>
                        {coverPreviewUrl ?
                          <img className={styles.coverPreview} src={coverPreviewUrl} alt="cover preview" /> :
                          <div className={styles.assetPlaceholder}>封面会被写入 metadata.image。</div>}
                      </div>
                      <div className={styles.noticeList}>
                        {needsAudioReattach &&
                          <div className={styles.noticeWarning}>刷新后音频文件对象丢失，需要重新挂载。</div>}
                        {needsCoverReattach &&
                          <div className={styles.noticeWarning}>刷新后封面文件对象丢失，需要重新挂载。</div>}
                        {!needsAudioReattach && !needsCoverReattach &&
                          <div className={styles.noticeInfo}>本地文件状态与服务端记录一致。</div>}
                      </div>
                    </section>
                  </div>
                )}

                {activePanel === 'storage' && (
                  <div className={styles.panelGrid}>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>存储控制台</div>
                      <div className={styles.formGrid}>
                        <label className={styles.label}>Web2.5 Backend URL<input className={styles.input}
                                                                                 value={web25BackendBaseUrl}
                                                                                 onChange={(e) => setByPath('services.web25Backend.baseUrl', e.target.value)} /></label>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>Gateway<input className={styles.input}
                                                                        value={pinataConfig?.gatewayBaseUrl || ''}
                                                                        readOnly /></label>
                          <label className={styles.label}>Network<input className={styles.input}
                                                                        value={pinataConfig?.network || ''} readOnly /></label>
                        </div>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>SIWE 会话<input className={styles.input}
                                                                          value={web25Session ? `${web25Session.address.slice(0, 10)}...` : '未登录'}
                                                                          readOnly /></label>
                          <label className={styles.label}>Upload Limit<input className={styles.input}
                                                                             value={pinataConfig ? formatBytes(pinataConfig.maxFileSizeBytes) : ''}
                                                                             readOnly /></label>
                        </div>
                        <div className={styles.actionRow}>
                          <button className={styles.primaryButton} onClick={() => void handleUploadAssets()}
                                  disabled={!selectedRelease || !web25Session || (!audioFile && !selectedRelease.audioStorageObjectId) || busyState !== 'idle'}>上传素材
                          </button>
                          <button className={styles.primaryButton} onClick={() => void handleUploadMetadata()}
                                  disabled={!selectedRelease?.audioStorageObjectId || !metadataDocument || busyState !== 'idle'}>上传
                            Metadata
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>已上传内容</div>
                      <div className={styles.formGrid}>
                        <div className={styles.assetBox}>
                          <div className={styles.assetTitle}>音频预览</div>
                          {selectedRelease.audioStorageObject ? (
                            <>
                              <audio controls className={styles.uploadedAudio} src={selectedRelease.audioStorageObject.gatewayUrl} />
                              <div className={styles.assetMetaRow}>
                                <span>{selectedRelease.audioStorageObject.name}</span>
                                <span>{formatBytes(selectedRelease.audioStorageObject.size)}</span>
                              </div>
                              <div className={`${styles.statusValue} ${styles.monospace}`}>{selectedRelease.audioStorageObject.cid}</div>
                            </>
                          ) : (
                            <div className={styles.assetPlaceholder}>音频上传后可在这里试听。</div>
                          )}
                        </div>
                        <div className={styles.assetBox}>
                          <div className={styles.assetTitle}>封面预览</div>
                          {selectedRelease.coverStorageObject ? (
                            <>
                              <img className={styles.coverPreview} src={selectedRelease.coverStorageObject.gatewayUrl} alt="已上传封面" />
                              <div className={styles.assetMetaRow}>
                                <span>{selectedRelease.coverStorageObject.name}</span>
                                <span>{formatBytes(selectedRelease.coverStorageObject.size)}</span>
                              </div>
                            </>
                          ) : (
                            <div className={styles.assetPlaceholder}>封面上传后可在这里查看。</div>
                          )}
                        </div>
                        <div className={styles.assetBox}>
                          <div className={styles.assetTitle}>Metadata 文件</div>
                          {selectedRelease.metadataStorageObject ? (
                            <>
                              <a className={styles.uploadedLink} href={selectedRelease.metadataStorageObject.gatewayUrl} target="_blank" rel="noreferrer">打开 metadata JSON</a>
                              <div className={styles.assetMetaRow}>
                                <span>{selectedRelease.metadataStorageObject.name}</span>
                                <span>{metadataUriForRelease(selectedRelease)}</span>
                              </div>
                            </>
                          ) : (
                            <div className={styles.assetPlaceholder}>Metadata 上传后可在这里打开。</div>
                          )}
                        </div>
                      </div>
                    </section>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>Metadata 预览</div>
                      <div
                        className={`${styles.codeBlock} ${styles.monospace}`}>{metadataDocument ? JSON.stringify(metadataDocument, null, 2) : '请先完善项目信息并上传音频素材。'}</div>
                    </section>
                  </div>
                )}

                {activePanel === 'publish' && (
                  <div className={styles.panelGrid}>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>链上配置</div>
                      <div className={styles.formGrid}>
                        <div className={styles.formRowTwo}>
                          <label className={styles.label}>链名称<input className={styles.input}
                                                                       value={web3Settings?.chainName || effectiveWeb3Settings.chainName}
                                                                       onChange={(e) => setByPath('services.web3Publishing.chainName', e.target.value)} /></label>
                          <label className={styles.label}>Chain ID<input className={styles.input} type="number"
                                                                         value={web3Settings?.chainId || effectiveWeb3Settings.chainId}
                                                                         onChange={(e) => setByPath('services.web3Publishing.chainId', Number(e.target.value) || DEFAULT_SEPOLIA_CONTRACTS.chainId)} /></label>
                        </div>
                        <label className={styles.label}>Explorer URL<input className={styles.input}
                                                                           value={web3Settings?.explorerUrl || effectiveWeb3Settings.explorerUrl}
                                                                           onChange={(e) => setByPath('services.web3Publishing.explorerUrl', e.target.value)} /></label>
                        <label className={styles.label}>MusicAsset<input className={styles.input}
                                                                         value={web3Settings?.musicAssetAddress || effectiveWeb3Settings.musicAssetAddress}
                                                                         onChange={(e) => setByPath('services.web3Publishing.musicAssetAddress', e.target.value)} /></label>
                        <label className={styles.label}>RoyaltySplitterFactory<input className={styles.input}
                                                                                     value={web3Settings?.royaltySplitterFactoryAddress || effectiveWeb3Settings.royaltySplitterFactoryAddress}
                                                                                     onChange={(e) => setByPath('services.web3Publishing.royaltySplitterFactoryAddress', e.target.value)} /></label>
                        <label className={styles.label}>PlatformHub<input className={styles.input}
                                                                          value={web3Settings?.platformHubAddress || effectiveWeb3Settings.platformHubAddress}
                                                                          onChange={(e) => setByPath('services.web3Publishing.platformHubAddress', e.target.value)} /></label>
                        <div className={styles.actionRow}>
                          <button className={styles.primaryButton} onClick={() => void handlePublish()}
                                  disabled={!selectedRelease?.metadataStorageObject || !walletProvider || busyState !== 'idle'}>发布到链上
                          </button>
                        </div>
                      </div>
                    </section>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>分账列表</div>
                      <div className={styles.splitList}>
                        {activeSplits.map((item, index) => (
                          <div key={item.id} className={styles.splitRow}>
                            <input className={styles.input} value={item.address}
                                   onChange={(e) => updateLocal({ royaltySplits: updateSplit(activeSplits, index, { address: e.target.value }) })}
                                   placeholder={`${item.label} wallet address`} />
                            <input className={styles.input} type="number" min={0} max={100} value={item.share}
                                   onChange={(e) => updateLocal({ royaltySplits: updateSplit(activeSplits, index, { share: Number(e.target.value) || 0 }) })} />
                            <button className={styles.dangerButton}
                                    onClick={() => updateLocal({ royaltySplits: activeSplits.length > 1 ? activeSplits.filter((split) => split.id !== item.id) : activeSplits })}>移除
                            </button>
                          </div>
                        ))}
                        <div className={styles.actionRow}>
                          <button className={styles.ghostButton} onClick={() => updateLocal({
                            royaltySplits: [...activeSplits, {
                              id: `split-${Date.now()}`,
                              label: `Collaborator ${activeSplits.length + 1}`,
                              address: '',
                              share: 0,
                            }],
                          })}>添加分账人
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {activePanel === 'access' && (
                  <div className={styles.panelGrid}>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>授权验证</div>
                      <div className={styles.formGrid}>
                        <label className={styles.label}>Token ID<input className={styles.input}
                                                                       value={accessCheck.tokenId || selectedRelease.tokenId || ''}
                                                                       onChange={(e) => setAccessCheck((prev) => ({
                                                                         ...prev,
                                                                         tokenId: e.target.value,
                                                                       }))} /></label>
                        <div className={styles.actionRow}>
                          <button className={styles.ghostButton} onClick={() => setAccessCheck((prev) => ({
                            ...prev,
                            tokenId: selectedRelease.tokenId || prev.tokenId,
                          }))}>使用当前 Token
                          </button>
                          <button className={styles.primaryButton} onClick={() => void handleRefreshAccess()}
                                  disabled={busyState !== 'idle' || !selectedRelease.tokenId}>查询授权
                          </button>
                          <button className={styles.primaryButton} onClick={() => void handleBuyAccess()}
                                  disabled={busyState !== 'idle' || !selectedRelease.tokenId}>购买访问权
                          </button>
                        </div>
                        <div className={styles.infoGrid}>
                          <div className={styles.infoCard}>
                            <div className={styles.infoLabel}>当前授权</div>
                            <div className={styles.infoBody}>Token #{accessCheck.tokenId || 'pending'}{'\n'}Requires
                              purchase: {String(accessCheck.requiresPurchase)}{'\n'}Active: {String(accessCheck.active)}{'\n'}Has
                              access: {String(accessCheck.hasAccess)}</div>
                          </div>
                          <div className={styles.infoCard}>
                            <div className={styles.infoLabel}>价格与分账</div>
                            <div className={styles.infoBody}>Price: {accessCheck.priceEth || 'pending'} ETH{'\n'}Platform
                              fee: {accessCheck.platformFeeEth || 'pending'} ETH{'\n'}Creator
                              proceeds: {accessCheck.creatorProceedsEth || 'pending'} ETH
                            </div>
                          </div>
                          <div className={styles.infoCard}>
                            <div className={styles.infoLabel}>链上地址</div>
                            <div
                              className={styles.infoBody}>Creator: {accessCheck.creator || 'pending'}{'\n'}Splitter: {accessCheck.payoutReceiver || 'pending'}</div>
                          </div>
                        </div>
                      </div>
                    </section>
                    <section className={styles.card}>
                      <div className={styles.cardTitle}>边界说明</div>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoCard}>
                          <div className={styles.infoLabel}>服务器</div>
                          <div className={styles.infoBody}>记录草稿、上传状态、失败原因、已发布列表与恢复上下文。</div>
                        </div>
                        <div className={styles.infoCard}>
                          <div className={styles.infoLabel}>IPFS</div>
                          <div className={styles.infoBody}>保存 metadata、封面和音频等内容寻址对象。</div>
                        </div>
                        <div className={styles.infoCard}>
                          <div className={styles.infoLabel}>链上</div>
                          <div className={styles.infoBody}>保存 tokenURI、授权规则、价格和分账接收方。</div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}
              </>
            )}
          </main>

          <aside className={styles.inspector}>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>恢复检查</div>
              {selectedRelease ? (
                <div className={styles.noticeList}>
                  <div className={styles.noticeInfo}>{selectedRelease.statusMessage || '等待下一步操作'}</div>
                  {selectedRelease.latestError &&
                    <div className={styles.noticeDanger}>{selectedRelease.latestError}</div>}
                  {needsAudioReattach &&
                    <div className={styles.noticeWarning}>音频文件已脱离本地内存，需要重新挂载。</div>}
                  {needsCoverReattach &&
                    <div className={styles.noticeWarning}>封面文件已脱离本地内存，需要重新挂载。</div>}
                </div>
              ) : <div className={styles.emptyBody}>选择项目后查看恢复信息。</div>}
            </section>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>产物索引</div>
              {selectedRelease ? (
                <div className={styles.statusList}>
                  <div className={styles.statusItem}>
                    <div className={styles.statusTitle}>Audio CID</div>
                    <div
                      className={`${styles.statusValue} ${styles.monospace}`}>{selectedRelease.audioStorageObject?.cid || 'pending'}</div>
                  </div>
                  <div className={styles.statusItem}>
                    <div className={styles.statusTitle}>Metadata URI</div>
                    <div
                      className={`${styles.statusValue} ${styles.monospace}`}>{metadataUriForRelease(selectedRelease) || 'ipfs://pending'}</div>
                  </div>
                  <div className={styles.statusItem}>
                    <div className={styles.statusTitle}>Token / Splitter</div>
                    <div className={`${styles.statusValue} ${styles.monospace}`}>Token
                      #{selectedRelease.tokenId || 'pending'}{'\n'}{selectedRelease.splitterAddress || 'splitter pending'}</div>
                  </div>
                  <div className={styles.statusItem}>
                    <div className={styles.statusTitle}>Publish / Purchase Tx</div>
                    <div
                      className={`${styles.statusValue} ${styles.monospace}`}>{selectedRelease.publishTxHash || 'publish pending'}{'\n'}{selectedRelease.purchaseTxHash || 'purchase pending'}</div>
                  </div>
                </div>
              ) : <div className={styles.emptyBody}>暂无项目。</div>}
            </section>
            <section className={styles.sidebarCard}>
              <div className={styles.sectionHeading}>活动日志</div>
              {selectedRelease ? (
                <div className={styles.logList}>
                  {(selectedRelease.activityLog.length ? selectedRelease.activityLog : [{
                    message: selectedRelease.statusMessage || '等待活动',
                    level: 'info' as const,
                    at: selectedRelease.updatedAt,
                  }]).map((entry) => (
                    <div key={`${entry.at}-${entry.message}`} className={styles.logItem}>
                      <div className={styles.logMeta}><span
                        className={`${styles.statusBadge} ${entry.level === 'error' ? styles.statusDanger : entry.level === 'success' ? styles.statusSuccess : styles.statusNeutral}`}>{entry.level}</span><span>{formatRelativeTime(entry.at)}</span>
                      </div>
                      <div className={styles.logMessage}>{entry.message}</div>
                    </div>
                  ))}
                </div>
              ) : <div className={styles.emptyBody}>暂无日志。</div>}
            </section>
          </aside>
        </div>
      </ViewShell>
    </div>
  );
}
