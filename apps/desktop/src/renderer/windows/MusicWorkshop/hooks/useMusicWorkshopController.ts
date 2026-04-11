import React from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSettingsContext } from '@renderer/core/config/SettingsContext';
import {
  buildSiweMessage,
  createCreatorRelease,
  type CreatorReleaseDashboard,
  type CreatorReleaseRecord,
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
import {
  type AccessCheckState,
  type AutosaveState,
  buildMetadataDocument,
  type BusyState,
  DEFAULT_ACCESS_CHECK_STATE,
  defaultSplits,
  EMPTY_DASHBOARD,
  filteredReleases,
  metadataUriForRelease,
  type ReleaseFilter,
  type ReleasePanel,
  replaceReleaseInDashboard,
  slugify,
} from '../workshopHelpers';

export function useMusicWorkshopController() {
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

  // 当服务端回填最新 release 时，跳过一次自动保存，避免客户端立刻把旧快照写回去。
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
    if (selectedRelease) {
      setActivePanel((selectedRelease.currentStage as ReleasePanel) || 'editor');
    }
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
    [
      audioFile?.type,
      coverFile?.type,
      effectiveWeb3Settings.chainName,
      effectiveWeb3Settings.musicAssetAddress,
      effectiveWeb3Settings.platformHubAddress,
      pinataConfig,
      selectedRelease,
    ],
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

  const updateLocalRelease = React.useCallback((patch: Partial<CreatorReleaseRecord>) => {
    setSelectedRelease((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleCreateRelease = React.useCallback(async () => {
    if (!web25Session) return;
    const created = await createCreatorRelease(web25BackendBaseUrl, {
      artistName: address || undefined,
      accessModel: 'purchase',
    });
    applyServerRelease({
      ...created,
      royaltySplits: created.royaltySplits.length ? created.royaltySplits : defaultSplits(address),
    });
  }, [address, applyServerRelease, web25BackendBaseUrl, web25Session]);

  const handleSiweLogin = React.useCallback(async () => {
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
  }, [address, refreshDashboard, walletProvider, web25BackendBaseUrl]);

  const handleSiweLogout = React.useCallback(async () => {
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
  }, [web25BackendBaseUrl]);

  const handleSelectRelease = React.useCallback((release: CreatorReleaseRecord) => {
    skipAutosaveRef.current = true;
    setSelectedRelease(release);
  }, []);

  const hydrateMetadataFromFile = React.useCallback(async (file: File) => {
    const path = (file as File & { path?: string }).path;
    if (!path) {
      return { title: file.name.replace(/\.[^.]+$/, ''), artist: '', album: '', genre: '' };
    }
    const metadata = await window.mainApi.creatorsWorkshopApi.readMetadata(path);
    return {
      title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
      artist: metadata.artist || '',
      album: metadata.album || '',
      genre: Array.isArray(metadata.genre) ? metadata.genre.join(', ') : (metadata.genre || ''),
    };
  }, []);

  const onAudioSelected = React.useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedRelease) return;
    setAudioFile(file);
    const metadata = await hydrateMetadataFromFile(file);
    updateLocalRelease({
      audioSourceName: file.name,
      audioSourcePath: (file as File & { path?: string }).path || null,
      title: selectedRelease.title || metadata.title,
      slug: slugify(selectedRelease.title || metadata.title),
      artistName: selectedRelease.artistName || metadata.artist,
      albumName: selectedRelease.albumName || metadata.album,
      genreLabel: selectedRelease.genreLabel || metadata.genre,
      statusMessage: `已挂载音频 ${file.name}`,
    });
  }, [hydrateMetadataFromFile, selectedRelease, updateLocalRelease]);

  const onCoverSelected = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    updateLocalRelease({
      coverSourceName: file.name,
      coverSourcePath: (file as File & { path?: string }).path || null,
      statusMessage: `已挂载封面 ${file.name}`,
    });
  }, [updateLocalRelease]);

  const normalizeSplits = React.useCallback((fallbackAddress: string) => {
    const source = selectedRelease?.royaltySplits.length
      ? selectedRelease.royaltySplits
      : defaultSplits(fallbackAddress);
    const normalized = source
      .map((item) => ({ ...item, address: item.address.trim(), share: Number(item.share || 0) }))
      .filter((item) => item.address && item.share > 0);
    return normalized.length ? normalized : defaultSplits(fallbackAddress);
  }, [selectedRelease?.royaltySplits]);

  const handleUploadAssets = React.useCallback(async () => {
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
          keyvalues: {
            kind: 'cover',
            releaseId: selectedRelease.id,
            artist: selectedRelease.artistName || 'unknown',
          },
        });
        coverStorageObjectId = result.storageObjectId;
      }

      let audioStorageObjectId = selectedRelease.audioStorageObjectId;
      if (audioFile) {
        const result = await uploadFileToWeb25Pinata(web25BackendBaseUrl, {
          file: audioFile,
          name: `${slugify(selectedRelease.title || audioFile.name)}-audio`,
          keyvalues: {
            kind: 'audio',
            releaseId: selectedRelease.id,
            artist: selectedRelease.artistName || 'unknown',
          },
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
  }, [audioFile, coverFile, patchRelease, selectedRelease, web25BackendBaseUrl, web25Session]);

  const handleUploadMetadata = React.useCallback(async () => {
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
        keyvalues: {
          kind: 'metadata',
          releaseId: selectedRelease.id,
          artist: selectedRelease.artistName || 'unknown',
        },
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
  }, [metadataDocument, patchRelease, selectedRelease, web25BackendBaseUrl]);

  const handlePublish = React.useCallback(async () => {
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
      const priceWei = requiresPurchase ? parseEther(selectedRelease.priceEth.trim() || '0') : BigInt(0);
      if (requiresPurchase && priceWei <= BigInt(0)) {
        throw new Error('购买模式需要填写大于 0 的 ETH 价格，或将访问模式改为公开可访问');
      }
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);

      const [predictedTokenId, predictedSplitter] = await platformHub.publishTrack.staticCall(
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
        currentStage: 'publish',
        latestError: null,
        statusMessage: '等待钱包确认链上发布交易',
        chainId: effectiveWeb3Settings.chainId,
        chainName: effectiveWeb3Settings.chainName,
        explorerUrl: effectiveWeb3Settings.explorerUrl,
        musicAssetAddress: effectiveWeb3Settings.musicAssetAddress,
        royaltySplitterFactoryAddress: effectiveWeb3Settings.royaltySplitterFactoryAddress,
        platformHubAddress: effectiveWeb3Settings.platformHubAddress,
        royaltySplits: splits,
      });

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
  }, [address, effectiveWeb3Settings, normalizeSplits, patchRelease, selectedRelease, walletProvider]);

  const handleRefreshAccess = React.useCallback(async () => {
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
  }, [address, effectiveWeb3Settings.platformHubAddress, selectedRelease?.tokenId, walletProvider]);

  const handleBuyAccess = React.useCallback(async () => {
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
  }, [effectiveWeb3Settings.platformHubAddress, handleRefreshAccess, patchRelease, selectedRelease?.tokenId, walletProvider]);

  const visibleReleases = React.useMemo(
    () => filteredReleases(dashboard.releases, releaseFilter),
    [dashboard.releases, releaseFilter],
  );

  const activeSplits = React.useMemo(
    () => selectedRelease
      ? (selectedRelease.royaltySplits.length ? selectedRelease.royaltySplits : defaultSplits(address))
      : [],
    [address, selectedRelease],
  );

  const needsAudioReattach = !!selectedRelease?.audioSourceName && !audioFile && !selectedRelease.audioStorageObject;
  const needsCoverReattach = !!selectedRelease?.coverSourceName && !coverFile && !selectedRelease.coverStorageObject;

  const updateSplitAt = React.useCallback((index: number, patch: Partial<CreatorReleaseRecord['royaltySplits'][number]>) => {
    if (!selectedRelease) return;
    const next = [...activeSplits];
    next[index] = { ...next[index], ...patch };
    updateLocalRelease({ royaltySplits: next });
  }, [activeSplits, selectedRelease, updateLocalRelease]);

  const addSplit = React.useCallback(() => {
    updateLocalRelease({
      royaltySplits: [
        ...activeSplits,
        {
          id: `split-${Date.now()}`,
          label: `Collaborator ${activeSplits.length + 1}`,
          address: '',
          share: 0,
        },
      ],
    });
  }, [activeSplits, updateLocalRelease]);

  const removeSplit = React.useCallback((splitId: string) => {
    updateLocalRelease({
      royaltySplits: activeSplits.length > 1
        ? activeSplits.filter((split) => split.id !== splitId)
        : activeSplits,
    });
  }, [activeSplits, updateLocalRelease]);

  const useCurrentToken = React.useCallback(() => {
    setAccessCheck((prev) => ({
      ...prev,
      tokenId: selectedRelease?.tokenId || prev.tokenId,
    }));
  }, [selectedRelease?.tokenId]);

  return {
    open,
    address,
    isConnected,
    settings,
    setByPath,
    dashboard,
    selectedRelease,
    releaseFilter,
    activePanel,
    audioFile,
    coverFile,
    coverPreviewUrl,
    accessCheck,
    busyState,
    autosaveState,
    authBusy,
    web25Session,
    pinataConfig,
    web25BackendBaseUrl,
    web3Settings,
    effectiveWeb3Settings,
    metadataDocument,
    visibleReleases,
    activeSplits,
    needsAudioReattach,
    needsCoverReattach,
    setReleaseFilter,
    setActivePanel,
    setAccessCheck,
    updateLocalRelease,
    handleCreateRelease,
    handleSiweLogin,
    handleSiweLogout,
    handleSelectRelease,
    refreshDashboard,
    onAudioSelected,
    onCoverSelected,
    handleUploadAssets,
    handleUploadMetadata,
    handlePublish,
    handleRefreshAccess,
    handleBuyAccess,
    updateSplitAt,
    addSplit,
    removeSplit,
    useCurrentToken,
  };
}

export type MusicWorkshopController = ReturnType<typeof useMusicWorkshopController>;
