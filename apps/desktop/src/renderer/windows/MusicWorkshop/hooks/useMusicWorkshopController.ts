import React from 'react';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSettingsContext } from '@renderer/core/config/SettingsContext';
import { type CreatorReleaseRecord } from '@renderer/core/web25/client';
import {
  type AccessCheckState,
  buildMetadataDocument,
  DEFAULT_ACCESS_CHECK_STATE,
  defaultSplits,
  normalizeReleasePanel,
  slugify,
} from '../workshopHelpers';
import { workshopActions } from './workshopSlice';
import { useMusicWorkshopDispatch, useMusicWorkshopSelector } from './workshopStore';
import { selectEffectiveWeb3Settings, selectVisibleReleases } from './workshopSelectors';
import {
  autosaveReleaseThunk,
  buyAccessThunk,
  createReleaseThunk,
  publishReleaseThunk,
  refreshAccessThunk,
  refreshDashboardThunk,
  refreshWeb25StateThunk,
  siweLoginThunk,
  siweLogoutThunk,
  uploadAssetsThunk,
  uploadMetadataThunk,
} from './workshopThunks';

export function useMusicWorkshopController() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const { settings, setByPath } = useSettingsContext();
  const dispatch = useMusicWorkshopDispatch();

  const store = useMusicWorkshopSelector((state) => state.workshop);
  const effectiveWeb3Settings = useMusicWorkshopSelector(selectEffectiveWeb3Settings);
  const visibleReleases = useMusicWorkshopSelector(selectVisibleReleases);
  const {
    dashboard,
    selectedRelease,
    releaseFilter,
    activePanel,
    busyState,
    autosaveState,
    authBusy,
    web25Session,
    pinataConfig,
  } = store;

  const setReleaseFilter = React.useCallback((value: typeof releaseFilter) => {
    dispatch(workshopActions.setReleaseFilter(value));
  }, [dispatch]);

  const setActivePanel = React.useCallback((value: typeof activePanel) => {
    dispatch(workshopActions.setActivePanel(value));
  }, [dispatch]);

  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = React.useState('');
  const [accessCheck, setAccessCheck] = React.useState<AccessCheckState>(DEFAULT_ACCESS_CHECK_STATE);

  // 当服务端回填最新 release 时，跳过一次自动保存，避免客户端立刻把旧快照写回去。
  const skipAutosaveRef = React.useRef(false);
  const web25BackendBaseUrl = settings?.services.web25Backend.baseUrl?.trim() || 'http://localhost:8787';

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
      setActivePanel(normalizeReleasePanel(selectedRelease.currentStage));
    }
  }, [selectedRelease?.id]);

  const applyServerRelease = React.useCallback((release: CreatorReleaseRecord) => {
    skipAutosaveRef.current = true;
    dispatch(workshopActions.applyServerRelease(release));
  }, [dispatch]);

  const refreshWeb25State = React.useCallback(async () => {
    await dispatch(refreshWeb25StateThunk({ baseUrl: web25BackendBaseUrl }));
  }, [dispatch, web25BackendBaseUrl]);

  const refreshDashboard = React.useCallback(async (preferredReleaseId?: string | null) => {
    skipAutosaveRef.current = true;
    await dispatch(refreshDashboardThunk({
      baseUrl: web25BackendBaseUrl,
      preferredReleaseId: preferredReleaseId ?? null,
    }));
  }, [dispatch, web25BackendBaseUrl]);

  React.useEffect(() => {
    void refreshWeb25State();
  }, [refreshWeb25State]);

  React.useEffect(() => {
    if (!web25Session) {
      dispatch(workshopActions.resetWorkspace());
      return;
    }
    void refreshDashboard();
  }, [dispatch, refreshDashboard, web25Session]);

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
        const updated = await dispatch(autosaveReleaseThunk({
          baseUrl: web25BackendBaseUrl,
          releaseId: selectedRelease.id,
          payload: autosavePayload,
        })).unwrap();
        applyServerRelease(updated);
      } catch {
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [applyServerRelease, autosavePayload, dispatch, selectedRelease, web25BackendBaseUrl, web25Session]);

  const updateLocalRelease = React.useCallback((patch: Partial<CreatorReleaseRecord>) => {
    dispatch(workshopActions.patchSelectedRelease(patch));
  }, [dispatch]);

  const handleCreateRelease = React.useCallback(async () => {
    if (!web25Session) return;
    skipAutosaveRef.current = true;
    await dispatch(createReleaseThunk({ baseUrl: web25BackendBaseUrl, address })).unwrap();
  }, [address, dispatch, web25BackendBaseUrl, web25Session]);

  const handleSiweLogin = React.useCallback(async () => {
    if (!walletProvider || !web25BackendBaseUrl) return;
    await dispatch(siweLoginThunk({
      baseUrl: web25BackendBaseUrl,
      walletProvider,
      fallbackAddress: address,
    })).unwrap();
    await refreshDashboard();
  }, [address, dispatch, refreshDashboard, walletProvider, web25BackendBaseUrl]);

  const handleSiweLogout = React.useCallback(async () => {
    if (!web25BackendBaseUrl) return;
    await dispatch(siweLogoutThunk({ baseUrl: web25BackendBaseUrl })).unwrap();
  }, [dispatch, web25BackendBaseUrl]);

  const handleSelectRelease = React.useCallback((release: CreatorReleaseRecord) => {
    skipAutosaveRef.current = true;
    dispatch(workshopActions.setSelectedRelease(release));
  }, [dispatch]);

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

  const handleUploadAssets = React.useCallback(async () => {
    if (!selectedRelease || !web25Session || (!audioFile && !selectedRelease.audioStorageObjectId)) return;
    skipAutosaveRef.current = true;
    await dispatch(uploadAssetsThunk({
      baseUrl: web25BackendBaseUrl,
      release: selectedRelease,
      audioFile,
      coverFile,
    })).unwrap();
  }, [audioFile, coverFile, dispatch, selectedRelease, web25BackendBaseUrl, web25Session]);

  const handleUploadMetadata = React.useCallback(async () => {
    if (!selectedRelease || !metadataDocument || !selectedRelease.audioStorageObjectId) return;
    skipAutosaveRef.current = true;
    const updated = await dispatch(uploadMetadataThunk({
      baseUrl: web25BackendBaseUrl,
      release: selectedRelease,
      metadataDocument,
    })).unwrap();
    if (updated.currentStage === 'publish') {
      setActivePanel('publish');
    }
  }, [dispatch, metadataDocument, selectedRelease, setActivePanel, web25BackendBaseUrl]);

  const handlePublish = React.useCallback(async () => {
    if (!selectedRelease || !walletProvider || !selectedRelease.metadataStorageObject || !effectiveWeb3Settings.platformHubAddress) return;
    skipAutosaveRef.current = true;
    const result = await dispatch(publishReleaseThunk({
      baseUrl: web25BackendBaseUrl,
      release: selectedRelease,
      walletProvider,
      fallbackAddress: address,
      effectiveWeb3Settings,
    })).unwrap();
    if (result.accessCheck) {
      setAccessCheck(result.accessCheck);
      setActivePanel('access');
    }
  }, [address, dispatch, effectiveWeb3Settings, selectedRelease, setActivePanel, walletProvider, web25BackendBaseUrl]);

  const handleRefreshAccess = React.useCallback(async () => {
    if (!walletProvider || !selectedRelease?.tokenId || !effectiveWeb3Settings.platformHubAddress) return;
    const next = await dispatch(refreshAccessThunk({
      walletProvider,
      tokenId: selectedRelease.tokenId,
      platformHubAddress: effectiveWeb3Settings.platformHubAddress,
      fallbackAddress: address,
    })).unwrap();
    setAccessCheck(next);
  }, [address, dispatch, effectiveWeb3Settings.platformHubAddress, selectedRelease?.tokenId, walletProvider]);

  const handleBuyAccess = React.useCallback(async () => {
    if (!walletProvider || !selectedRelease?.tokenId || !effectiveWeb3Settings.platformHubAddress) return;
    skipAutosaveRef.current = true;
    await dispatch(buyAccessThunk({
      baseUrl: web25BackendBaseUrl,
      releaseId: selectedRelease.id,
      tokenId: selectedRelease.tokenId,
      walletProvider,
      platformHubAddress: effectiveWeb3Settings.platformHubAddress,
    })).unwrap();
    await handleRefreshAccess();
  }, [dispatch, effectiveWeb3Settings.platformHubAddress, handleRefreshAccess, selectedRelease?.id, selectedRelease?.tokenId, walletProvider, web25BackendBaseUrl]);

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
