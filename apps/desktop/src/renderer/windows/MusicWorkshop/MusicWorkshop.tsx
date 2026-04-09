import React from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSettingsContext } from '@renderer/core/config/SettingsContext';
import {
  buildSiweMessage,
  getPinataConfig,
  getWeb25Session,
  logoutWeb25,
  requestSiweNonce,
  uploadFileToWeb25Pinata,
  verifySiweSession,
  type PinataConfigPayload,
  type Web25Session,
} from '@renderer/core/web25/client';
import { DEFAULT_SEPOLIA_CONTRACTS, PLATFORM_HUB_ABI } from '@src/shared/web3/freeflowContracts';
import ViewShell from '@renderer/windows/main/Maincontent/ViewShell/ViewShell';
import styles from './MusicWorkshop.module.css';
import './MusicWorkshop.css';

type WorkshopTab = 'assets' | 'storage' | 'mint' | 'flow';
type AccessModel = 'open' | 'purchase';

type AssetState = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  description: string;
  accessModel: AccessModel;
  previewSeconds: number;
  priceEth: string;
  royaltyBps: number;
};

type SplitRecipient = {
  id: string;
  label: string;
  address: string;
  share: number;
};

type UploadState = {
  audioCid: string;
  audioGatewayUrl: string;
  coverCid: string;
  coverGatewayUrl: string;
  metadataCid: string;
  metadataUri: string;
  metadataGatewayUrl: string;
  lastAction: string;
  splitterAddress: string;
  publishTxHash: string;
  purchaseTxHash: string;
  tokenId: string;
};

type AccessCheckState = {
  tokenId: string;
  creator: string;
  payoutReceiver: string;
  priceEth: string;
  requiresPurchase: boolean | null;
  active: boolean | null;
  hasAccess: boolean | null;
  platformFeeEth: string;
  creatorProceedsEth: string;
  lastUpdated: string;
};

const TABS: Array<{ value: WorkshopTab; label: string }> = [
  { value: 'assets', label: '作品准备' },
  { value: 'storage', label: 'Pinata / IPFS' },
  { value: 'mint', label: '铸造与分账' },
  { value: 'flow', label: '购买与取回' },
];

const DEFAULT_ASSET_STATE: AssetState = {
  title: '',
  artist: '',
  album: '',
  genre: '',
  description: '',
  accessModel: 'purchase',
  previewSeconds: 30,
  priceEth: '0.015',
  royaltyBps: 1000,
};

const DEFAULT_UPLOAD_STATE: UploadState = {
  audioCid: '',
  audioGatewayUrl: '',
  coverCid: '',
  coverGatewayUrl: '',
  metadataCid: '',
  metadataUri: '',
  metadataGatewayUrl: '',
  lastAction: '等待创作者添加作品素材',
  splitterAddress: '',
  publishTxHash: '',
  purchaseTxHash: '',
  tokenId: '',
};

const DEFAULT_ACCESS_CHECK_STATE: AccessCheckState = {
  tokenId: '',
  creator: '',
  payoutReceiver: '',
  priceEth: '',
  requiresPurchase: null,
  active: null,
  hasAccess: null,
  platformFeeEth: '',
  creatorProceedsEth: '',
  lastUpdated: '尚未查询购买权限',
};

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatBytes(size?: number) {
  if (!size) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-track';
}

export default function MusicWorkshop() {
  const { open } = useWeb3Modal();
  const { address, isConnected } = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const { settings, setByPath } = useSettingsContext();

  const [activeTab, setActiveTab] = React.useState<WorkshopTab>('assets');
  const [asset, setAsset] = React.useState<AssetState>(DEFAULT_ASSET_STATE);
  const [audioFile, setAudioFile] = React.useState<File | null>(null);
  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = React.useState('');
  const [upload, setUpload] = React.useState<UploadState>(DEFAULT_UPLOAD_STATE);
  const [accessCheck, setAccessCheck] = React.useState<AccessCheckState>(DEFAULT_ACCESS_CHECK_STATE);
  const [statusLog, setStatusLog] = React.useState<string[]>(['等待创作者开始发布流程']);
  const [royaltySplits, setRoyaltySplits] = React.useState<SplitRecipient[]>([
    { id: makeId('split'), label: 'Primary artist', address: '', share: 100 },
  ]);
  const [busyState, setBusyState] = React.useState<'idle' | 'uploading-assets' | 'uploading-metadata' | 'publishing' | 'checking-access' | 'buying'>('idle');
  const [authBusy, setAuthBusy] = React.useState(false);
  const [web25Session, setWeb25Session] = React.useState<Web25Session | null>(null);
  const [pinataConfig, setPinataConfig] = React.useState<PinataConfigPayload | null>(null);

  const web25BackendBaseUrl = settings?.services.web25Backend.baseUrl?.trim() || 'http://localhost:8787';
  const web3Settings = settings?.services.web3Publishing;
  const effectiveWeb3Settings = React.useMemo(() => ({
    chainId: web3Settings?.chainId || DEFAULT_SEPOLIA_CONTRACTS.chainId,
    chainName: web3Settings?.chainName || DEFAULT_SEPOLIA_CONTRACTS.chainName,
    rpcUrl: web3Settings?.rpcUrl || DEFAULT_SEPOLIA_CONTRACTS.rpcUrl,
    explorerUrl: web3Settings?.explorerUrl || DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
    musicAssetAddress: web3Settings?.musicAssetAddress || DEFAULT_SEPOLIA_CONTRACTS.musicAssetAddress,
    royaltySplitterFactoryAddress: web3Settings?.royaltySplitterFactoryAddress || DEFAULT_SEPOLIA_CONTRACTS.royaltySplitterFactoryAddress,
    platformHubAddress: web3Settings?.platformHubAddress || DEFAULT_SEPOLIA_CONTRACTS.platformHubAddress,
    defaultRoyaltyBps: web3Settings?.defaultRoyaltyBps || DEFAULT_SEPOLIA_CONTRACTS.defaultRoyaltyBps,
    platformFeeBps: web3Settings?.platformFeeBps || DEFAULT_SEPOLIA_CONTRACTS.platformFeeBps,
  }), [web3Settings]);

  React.useEffect(() => {
    if (!coverFile) {
      setCoverPreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  const appendStatus = React.useCallback((message: string) => {
    setStatusLog((prev) => [message, ...prev].slice(0, 8));
    setUpload((prev) => ({ ...prev, lastAction: message }));
  }, []);

  const refreshWeb25State = React.useCallback(async (silent = false) => {
    if (!web25BackendBaseUrl) {
      setWeb25Session(null);
      setPinataConfig(null);
      return;
    }

    try {
      const [sessionPayload, pinataPayload] = await Promise.all([
        getWeb25Session(web25BackendBaseUrl),
        getPinataConfig(web25BackendBaseUrl),
      ]);
      setWeb25Session(sessionPayload.session);
      setPinataConfig(pinataPayload);
    } catch (error) {
      setWeb25Session(null);
      setPinataConfig(null);
      if (!silent) {
        appendStatus(`后端不可用：${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [appendStatus, web25BackendBaseUrl]);

  React.useEffect(() => {
    void refreshWeb25State(true);
  }, [refreshWeb25State]);

  const updateAsset = <K extends keyof AssetState>(key: K, value: AssetState[K]) => {
    setAsset((prev) => ({ ...prev, [key]: value }));
  };

  const updateSplit = (id: string, patch: Partial<SplitRecipient>) => {
    setRoyaltySplits((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addSplit = () => {
    setRoyaltySplits((prev) => [...prev, { id: makeId('split'), label: `Collaborator ${prev.length}`, address: '', share: 0 }]);
  };

  const removeSplit = (id: string) => {
    setRoyaltySplits((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
  };

  const hydrateMetadataFromFile = React.useCallback(async (file: File) => {
    const maybePath = (file as File & { path?: string }).path;
    if (!maybePath) {
      if (!asset.title) updateAsset('title', file.name.replace(/\.[^.]+$/, ''));
      return;
    }

    const metadata = await window.mainApi.creatorsWorkshopApi.readMetadata(maybePath);
    setAsset((prev) => ({
      ...prev,
      title: metadata.title || prev.title || file.name.replace(/\.[^.]+$/, ''),
      artist: metadata.artist || prev.artist,
      album: metadata.album || prev.album,
      genre: Array.isArray(metadata.genre) ? metadata.genre.join(', ') : (metadata.genre || prev.genre),
    }));
  }, [asset.title]);

  const onAudioSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    appendStatus(`已载入音频文件：${file.name}`);
    await hydrateMetadataFromFile(file);
  };

  const onCoverSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    appendStatus(`已载入封面文件：${file.name}`);
  };

  const metadataDocument = React.useMemo(() => {
    return {
      name: asset.title || 'Untitled Track',
      description: asset.description || 'Published from FreeFlow Creators Workshop',
      image: upload.coverCid ? `ipfs://${upload.coverCid}` : '',
      external_url: upload.metadataGatewayUrl || '',
      attributes: [
        { trait_type: 'Artist', value: asset.artist || 'Unknown Artist' },
        { trait_type: 'Album', value: asset.album || 'Single' },
        { trait_type: 'Genre', value: asset.genre || 'Unspecified' },
        { trait_type: 'Access Model', value: asset.accessModel === 'purchase' ? 'Purchase Required' : 'Open Access' },
        { trait_type: 'Preview Seconds', value: asset.previewSeconds },
        { trait_type: 'Royalty BPS', value: asset.royaltyBps },
      ],
      properties: {
        media: {
          audio: upload.audioCid ? {
            uri: `ipfs://${upload.audioCid}`,
            gateway: upload.audioGatewayUrl,
            mimeType: audioFile?.type || 'audio/mpeg',
            access: asset.accessModel,
          } : null,
          cover: upload.coverCid ? {
            uri: `ipfs://${upload.coverCid}`,
            gateway: upload.coverGatewayUrl,
            mimeType: coverFile?.type || 'image/png',
          } : null,
        },
        commerce: {
          unlockPriceEth: asset.accessModel === 'purchase' ? asset.priceEth : '0',
          platformHubAddress: effectiveWeb3Settings.platformHubAddress || '0xYOUR_PLATFORM_HUB',
        },
        provenance: {
          storageProvider: 'Pinata',
          pinataGroupId: pinataConfig?.groupIdConfigured ? 'configured-on-server' : '',
          chainName: effectiveWeb3Settings.chainName,
          musicAssetAddress: effectiveWeb3Settings.musicAssetAddress || '0xYOUR_MUSIC_ASSET',
        },
      },
    };
  }, [asset, audioFile, coverFile, effectiveWeb3Settings, pinataConfig, upload]);

  const curlPreview = React.useMemo(() => {
    return [
      `curl --request POST "${web25BackendBaseUrl.replace(/\/$/, '')}/api/v1/storage/pinata/files" \\`,
      '  --header "Authorization: Bearer <SIWE_SESSION_TOKEN>" \\',
      `  --form "name=${slugify(asset.title || 'untitled-track')}" \\`,
      '  --form \'keyvalues={"kind":"audio"}\' \\',
      '  --form "file=@./your-audio-file.mp3"',
    ].join('\n');
  }, [asset.title, web25BackendBaseUrl]);

  const uploadFileToPinata = async (file: File, name: string, keyvalues: Record<string, string>) => {
    if (!web25BackendBaseUrl) {
      throw new Error('Web2.5 后端地址为空');
    }
    if (!web25Session) {
      throw new Error('请先完成 SIWE 登录');
    }

    return await uploadFileToWeb25Pinata(web25BackendBaseUrl, {
      file,
      name,
      keyvalues,
    });
  };

  const handleSiweLogin = async () => {
    if (!walletProvider) {
      appendStatus('请先连接钱包');
      return;
    }
    if (!web25BackendBaseUrl) {
      appendStatus('请先配置 Web2.5 后端地址');
      return;
    }

    setAuthBusy(true);

    try {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const signerAddress = address || await signer.getAddress();
      const network = await ethersProvider.getNetwork();
      const chainId = Number(network.chainId);
      const noncePayload = await requestSiweNonce(web25BackendBaseUrl, {
        address: signerAddress,
        chainId,
      });
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
      const verifiedPayload = await verifySiweSession(web25BackendBaseUrl, {
        message,
        signature,
      });

      setWeb25Session(verifiedPayload.session);
      appendStatus(`SIWE 登录成功：${verifiedPayload.session.address.slice(0, 10)}...`);
      await refreshWeb25State(true);
    } catch (error) {
      appendStatus(`SIWE 登录失败：${error instanceof Error ? error.message : String(error)}`);
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
      appendStatus('已退出 Web2.5 会话');
    } catch (error) {
      appendStatus(`退出会话失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUploadAssets = async () => {
    if (!audioFile) {
      appendStatus('请先添加音频文件');
      return;
    }

    setBusyState('uploading-assets');

    try {
      let nextCoverCid = upload.coverCid;
      let nextCoverGateway = upload.coverGatewayUrl;

      if (coverFile) {
        appendStatus('正在将封面上传到 Pinata...');
        const coverResult = await uploadFileToPinata(
          coverFile,
          `${slugify(asset.title || coverFile.name)}-cover`,
          { kind: 'cover', artist: asset.artist || 'unknown' },
        );
        nextCoverCid = coverResult.cid;
        nextCoverGateway = coverResult.gatewayUrl;
      }

      appendStatus('正在将音频上传到 Pinata...');
      const audioResult = await uploadFileToPinata(
        audioFile,
        `${slugify(asset.title || audioFile.name)}-audio`,
        { kind: 'audio', artist: asset.artist || 'unknown' },
      );

      setUpload((prev) => ({
        ...prev,
        audioCid: audioResult.cid,
        audioGatewayUrl: audioResult.gatewayUrl,
        coverCid: nextCoverCid,
        coverGatewayUrl: nextCoverGateway,
        lastAction: '音频与封面已上传到 Pinata',
      }));
      appendStatus('音频与封面已上传到 Pinata');
      setActiveTab('storage');
    } catch (error) {
      appendStatus(`上传失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const handleUploadMetadata = async () => {
    if (!upload.audioCid) {
      appendStatus('请先上传音频文件到 Pinata');
      return;
    }

    setBusyState('uploading-metadata');
    try {
      appendStatus('正在上传 metadata JSON...');
      const metadataFile = new File(
        [JSON.stringify(metadataDocument, null, 2)],
        `${slugify(asset.title || 'untitled-track')}-metadata.json`,
        { type: 'application/json' },
      );

      const metadataResult = await uploadFileToPinata(
        metadataFile,
        `${slugify(asset.title || 'untitled-track')}-metadata`,
        { kind: 'metadata', artist: asset.artist || 'unknown' },
      );

      const metadataCid = metadataResult.cid;
      setUpload((prev) => ({
        ...prev,
        metadataCid,
        metadataUri: `ipfs://${metadataCid}`,
        metadataGatewayUrl: metadataResult.gatewayUrl,
        lastAction: 'metadata 已上传，可以进入链上发布阶段',
      }));
      appendStatus('metadata 已上传，可以进入链上发布阶段');
      setActiveTab('mint');
    } catch (error) {
      appendStatus(`metadata 上传失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const normalizeSplits = (fallbackAddress: string) => {
    const normalizedSplits = royaltySplits
      .map((item) => ({
        ...item,
        address: item.address.trim(),
        share: Number(item.share || 0),
      }))
      .filter((item) => item.address && item.share > 0);

    return normalizedSplits.length
      ? normalizedSplits
      : [{ id: makeId('split'), label: 'Primary artist', address: fallbackAddress, share: 100 }];
  };

  const handlePublish = async () => {
    if (!walletProvider) {
      appendStatus('请先连接钱包');
      return;
    }

    if (!upload.metadataUri) {
      appendStatus('请先上传 metadata JSON');
      return;
    }

    if (!effectiveWeb3Settings.platformHubAddress) {
      appendStatus('PlatformHub 地址为空，无法发布作品');
      return;
    }

    setBusyState('publishing');

    try {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const artistAddress = address || await signer.getAddress();
      const finalSplits = normalizeSplits(artistAddress);
      const requiresPurchase = asset.accessModel === 'purchase';
      const priceWei = requiresPurchase ? parseEther(asset.priceEth || '0') : BigInt(0);
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);

      appendStatus('正在通过 PlatformHub 一次性发布作品...');
      const [predictedTokenId, predictedSplitterAddress] = await platformHub.publishTrack.staticCall(
        upload.metadataUri,
        asset.royaltyBps,
        requiresPurchase,
        priceWei,
        true,
        finalSplits.map((item) => item.address),
        finalSplits.map((item) => item.share),
      );
      const publishTx = await platformHub.publishTrack(
        upload.metadataUri,
        asset.royaltyBps,
        requiresPurchase,
        priceWei,
        true,
        finalSplits.map((item) => item.address),
        finalSplits.map((item) => item.share),
      );
      await publishTx.wait();

      setUpload((prev) => ({
        ...prev,
        splitterAddress: predictedSplitterAddress,
        publishTxHash: publishTx.hash,
        tokenId: predictedTokenId.toString(),
        lastAction: '作品已发布到链上，可以开始测试购买与授权查询',
      }));
      setAccessCheck((prev) => ({
        ...prev,
        tokenId: predictedTokenId.toString(),
        creator: artistAddress,
        payoutReceiver: predictedSplitterAddress,
        priceEth: requiresPurchase ? asset.priceEth : '0',
        requiresPurchase,
        active: true,
        hasAccess: requiresPurchase ? null : true,
        lastUpdated: '已根据发布结果预填作品编号，可直接切到购买与取回页签',
      }));
      appendStatus(`作品发布完成：Token #${predictedTokenId.toString()}`);
      setActiveTab('flow');
    } catch (error) {
      appendStatus(`发布失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const handleRefreshAccess = async () => {
    if (!walletProvider) {
      appendStatus('请先连接钱包后再查询授权');
      return;
    }

    const targetTokenId = accessCheck.tokenId || upload.tokenId;
    if (!targetTokenId) {
      appendStatus('请先填写要查询的 Token ID');
      return;
    }
    if (!effectiveWeb3Settings.platformHubAddress) {
      appendStatus('PlatformHub 地址为空，无法查询链上配置');
      return;
    }

    setBusyState('checking-access');

    try {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const currentAddress = address || await signer.getAddress();
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);
      const [creator, payoutReceiver, price, requiresPurchase, active] = await platformHub.getTrackSaleConfig(targetTokenId);
      const hasAccess = await platformHub.hasAccess(currentAddress, targetTokenId);
      const [, platformFee, creatorProceeds] = await platformHub.paymentPreview(targetTokenId);

      setAccessCheck({
        tokenId: String(targetTokenId),
        creator,
        payoutReceiver,
        priceEth: formatEther(price),
        requiresPurchase,
        active,
        hasAccess,
        platformFeeEth: formatEther(platformFee),
        creatorProceedsEth: formatEther(creatorProceeds),
        lastUpdated: `已查询 ${currentAddress.slice(0, 6)}... 的链上授权状态`,
      });
      appendStatus(`链上查询完成：Token #${targetTokenId}`);
    } catch (error) {
      appendStatus(`查询失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const handleBuyAccess = async () => {
    if (!walletProvider) {
      appendStatus('请先连接钱包后再购买');
      return;
    }

    const targetTokenId = accessCheck.tokenId || upload.tokenId;
    if (!targetTokenId) {
      appendStatus('请先填写要购买的 Token ID');
      return;
    }
    if (!effectiveWeb3Settings.platformHubAddress) {
      appendStatus('PlatformHub 地址为空，无法发起购买');
      return;
    }

    setBusyState('buying');

    try {
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const platformHub = new Contract(effectiveWeb3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);
      const [, , price, requiresPurchase] = await platformHub.getTrackSaleConfig(targetTokenId);

      if (!requiresPurchase) {
        appendStatus('该作品当前为公开访问，不需要购买');
        return;
      }

      appendStatus(`正在购买 Token #${targetTokenId} 的访问权...`);
      const buyTx = await platformHub.buyAccess(targetTokenId, { value: price });
      await buyTx.wait();

      setUpload((prev) => ({
        ...prev,
        purchaseTxHash: buyTx.hash,
        lastAction: `访问权购买成功：${buyTx.hash.slice(0, 10)}...`,
      }));
      appendStatus(`购买完成：${buyTx.hash}`);
      await handleRefreshAccess();
    } catch (error) {
      appendStatus(`购买失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const steps = [
    { label: '选择音频文件', done: !!audioFile },
    { label: '准备封面与文案', done: !!coverFile && !!asset.title },
    { label: '上传音频 / 封面到 Pinata', done: !!upload.audioCid },
    { label: '上传 metadata JSON', done: !!upload.metadataCid },
    { label: '通过 PlatformHub 发布作品', done: !!upload.publishTxHash },
    { label: '测试链上购买 / 授权查询', done: asset.accessModel === 'open' || !!upload.purchaseTxHash },
  ];

  const header = (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.title}>Creators Workshop</div>
        <div className={styles.subtitle}>
          在一个独立窗口里完成歌手发布流程：整理作品素材、接入 Pinata、存储到 IPFS，并通过 PlatformHub 一次性完成分账部署、NFT 铸造和销售配置。
        </div>
      </div>
        <div className={styles.headerActions}>
          <button className={styles.ghostButton} onClick={() => setActiveTab('flow')}>
            查看发行流程
          </button>
        <button className={styles.walletButton} onClick={() => open()}>
          {isConnected ? `钱包已连接 ${address?.slice(0, 6)}...` : '连接创作者钱包'}
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.window}>
      <ViewShell header={header} padded={false} hideScrollbar className={styles.shell}>
        <div className={styles.body}>
          <div className={styles.main}>
            <section className={styles.hero}>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>Chain: {effectiveWeb3Settings.chainName}</span>
                <span className={styles.badge}>Access: {asset.accessModel === 'purchase' ? 'Purchase Required' : 'Open Access'}</span>
                <span className={styles.badge}>Pinata: Server Controlled</span>
                <span className={styles.badge}>SIWE: {web25Session ? 'Authenticated' : 'Not Signed In'}</span>
              </div>
              <div className={styles.heroGrid}>
                <div className={styles.heroStat}>
                  <div className={styles.heroLabel}>当前作品</div>
                  <div className={styles.heroValue}>{asset.title || 'Untitled Draft'}</div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.heroLabel}>Metadata URI</div>
                  <div className={`${styles.heroValue} ${styles.monospace}`}>{upload.metadataUri || 'ipfs://pending'}</div>
                </div>
                <div className={styles.heroStat}>
                  <div className={styles.heroLabel}>最近动作</div>
                  <div className={styles.heroValue}>{upload.lastAction}</div>
                </div>
              </div>
            </section>

            <div className={styles.tabs}>
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  className={`${styles.tabButton} ${activeTab === tab.value ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab(tab.value)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'assets' && (
              <div className={styles.gridTwo}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>1. 作品素材</div>
                  <div className={styles.cardSub}>选择完整音频和封面图。组件会优先读取本地音频标签来预填标题、歌手和专辑信息。</div>

                  <div className={styles.assetPicker}>
                    <div className={styles.row}>
                      <label className={styles.primaryButton}>
                        选择音频文件
                        <input hidden type="file" accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a" onChange={onAudioSelected} />
                      </label>
                      {audioFile && <span className={styles.hint}>{audioFile.name}</span>}
                    </div>
                    <div className={styles.assetMeta}>
                      <span>{audioFile ? formatBytes(audioFile.size) : '尚未选择音频文件'}</span>
                      <span>{audioFile?.type || 'audio/*'}</span>
                    </div>
                  </div>

                  <div className={styles.assetPicker}>
                    <div className={styles.row}>
                      <label className={styles.ghostButton}>
                        选择封面图
                        <input hidden type="file" accept="image/*,.png,.jpg,.jpeg,.webp" onChange={onCoverSelected} />
                      </label>
                      {coverFile && <span className={styles.hint}>{coverFile.name}</span>}
                    </div>
                    {coverPreviewUrl ? (
                      <img className={styles.coverPreview} src={coverPreviewUrl} alt="cover preview" />
                    ) : (
                      <div className={styles.assetPicker}>
                        <span className={styles.hint}>封面将被写入 metadata.image 并作为 NFT 展示图。</span>
                      </div>
                    )}
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>2. 作品信息</div>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        标题
                        <input className={styles.input} value={asset.title} onChange={(e) => updateAsset('title', e.target.value)} placeholder="例如：Midnight in Hangzhou" />
                      </label>
                      <label className={styles.label}>
                        歌手
                        <input className={styles.input} value={asset.artist} onChange={(e) => updateAsset('artist', e.target.value)} placeholder="Creator name" />
                      </label>
                    </div>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        专辑
                        <input className={styles.input} value={asset.album} onChange={(e) => updateAsset('album', e.target.value)} placeholder="Single / Album name" />
                      </label>
                      <label className={styles.label}>
                        流派
                        <input className={styles.input} value={asset.genre} onChange={(e) => updateAsset('genre', e.target.value)} placeholder="Ambient, Pop, Folk..." />
                      </label>
                    </div>
                    <label className={styles.label}>
                      作品描述
                      <textarea className={styles.textarea} value={asset.description} onChange={(e) => updateAsset('description', e.target.value)} placeholder="写给收藏者看的发布说明、灵感来源、制作名单等" />
                    </label>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        访问模式
                        <select className={styles.select} value={asset.accessModel} onChange={(e) => updateAsset('accessModel', e.target.value as AccessModel)}>
                          <option value="purchase">购买后完整获取</option>
                          <option value="open">公开可访问</option>
                        </select>
                      </label>
                      <label className={styles.label}>
                        试听时长（秒）
                        <input className={styles.input} type="number" min={10} max={120} value={asset.previewSeconds} onChange={(e) => updateAsset('previewSeconds', Number(e.target.value) || 30)} />
                      </label>
                    </div>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        购买价格（ETH）
                        <input className={styles.input} value={asset.priceEth} onChange={(e) => updateAsset('priceEth', e.target.value)} placeholder="0.015" />
                      </label>
                      <label className={styles.label}>
                        ERC-2981 版税（BPS）
                        <input className={styles.input} type="number" min={0} max={10000} value={asset.royaltyBps} onChange={(e) => updateAsset('royaltyBps', Number(e.target.value) || 0)} />
                      </label>
                    </div>
                    <div className={styles.row}>
                      <button className={styles.primaryButton} onClick={handleUploadAssets} disabled={busyState !== 'idle'}>
                        上传音频与封面
                      </button>
                      <button className={styles.ghostButton} onClick={() => setActiveTab('storage')}>
                        先去看 Pinata 配置
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className={styles.gridTwo}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>3. Pinata 配置</div>
                  <div className={styles.cardSub}>
                    Pinata JWT 已迁移到 Web2.5 后端统一托管。桌面端只保留后端地址和 SIWE 会话，不再直连 Pinata。
                  </div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.label}>
                      Web2.5 Backend URL
                      <input
                        className={styles.input}
                        value={web25BackendBaseUrl}
                        onChange={(e) => setByPath('services.web25Backend.baseUrl', e.target.value)}
                        placeholder="http://localhost:8787"
                      />
                    </label>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        Gateway
                        <input
                          className={styles.input}
                          value={pinataConfig?.gatewayBaseUrl || ''}
                          readOnly
                          placeholder="由后端返回"
                        />
                      </label>
                      <label className={styles.label}>
                        当前网络
                        <input
                          className={styles.input}
                          value={pinataConfig?.network || ''}
                          readOnly
                          placeholder="由后端返回"
                        />
                      </label>
                    </div>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        SIWE 会话
                        <input
                          className={styles.input}
                          value={web25Session ? `${web25Session.address.slice(0, 10)}...` : '未登录'}
                          readOnly
                        />
                      </label>
                      <label className={styles.label}>
                        Upload Limit
                        <input
                          className={styles.input}
                          value={pinataConfig ? formatBytes(pinataConfig.maxFileSizeBytes) : ''}
                          readOnly
                          placeholder="由后端返回"
                        />
                      </label>
                    </div>
                    <div className={styles.row}>
                      <button className={styles.ghostButton} onClick={handleSiweLogin} disabled={authBusy}>
                        {authBusy ? '登录中…' : (web25Session ? '重新进行 SIWE 登录' : '进行 SIWE 登录')}
                      </button>
                      <button className={styles.ghostButton} onClick={handleSiweLogout} disabled={authBusy || !web25Session}>
                        退出后端会话
                      </button>
                    </div>
                    <div className={styles.row}>
                      <button className={styles.primaryButton} onClick={handleUploadAssets} disabled={busyState !== 'idle'}>
                        重新上传素材
                      </button>
                      <button className={styles.primaryButton} onClick={handleUploadMetadata} disabled={busyState !== 'idle'}>
                        上传 Metadata JSON
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>4. Metadata 与上传请求预览</div>
                  <div className={styles.cardSub}>这部分展示实际会被铸造成 tokenURI 的 JSON 内容，以及按 Pinata 文档方式组织的上传请求示例。</div>
                  <div className={`${styles.code} ${styles.monospace}`}>{JSON.stringify(metadataDocument, null, 2)}</div>
                  <div className={styles.separator} />
                  <div className={`${styles.code} ${styles.monospace}`}>{curlPreview}</div>
                </section>
              </div>
            )}

            {activeTab === 'mint' && (
              <div className={styles.gridTwo}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>5. 合约配置与发布</div>
                  <div className={styles.cardSub}>
                    当前链路使用 `PlatformHub.publishTrack(...)` 一次完成 splitter 部署、MusicAsset 铸造和销售配置，桌面端不再手动串三笔交易。
                  </div>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        链名称
                        <input className={styles.input} value={web3Settings?.chainName || effectiveWeb3Settings.chainName} onChange={(e) => setByPath('services.web3Publishing.chainName', e.target.value)} />
                      </label>
                      <label className={styles.label}>
                        Chain ID
                        <input className={styles.input} type="number" value={web3Settings?.chainId || effectiveWeb3Settings.chainId} onChange={(e) => setByPath('services.web3Publishing.chainId', Number(e.target.value) || DEFAULT_SEPOLIA_CONTRACTS.chainId)} />
                      </label>
                    </div>
                    <label className={styles.label}>
                      Explorer URL
                      <input className={styles.input} value={web3Settings?.explorerUrl || effectiveWeb3Settings.explorerUrl} onChange={(e) => setByPath('services.web3Publishing.explorerUrl', e.target.value)} placeholder="https://sepolia.etherscan.io" />
                    </label>
                    <label className={styles.label}>
                      MusicAsset 地址
                      <input className={styles.input} value={web3Settings?.musicAssetAddress || effectiveWeb3Settings.musicAssetAddress} onChange={(e) => setByPath('services.web3Publishing.musicAssetAddress', e.target.value)} placeholder="0xYOUR_MUSIC_ASSET" />
                    </label>
                    <label className={styles.label}>
                      RoyaltySplitterFactory 地址
                      <input className={styles.input} value={web3Settings?.royaltySplitterFactoryAddress || effectiveWeb3Settings.royaltySplitterFactoryAddress} onChange={(e) => setByPath('services.web3Publishing.royaltySplitterFactoryAddress', e.target.value)} placeholder="0xYOUR_SPLITTER_FACTORY" />
                    </label>
                    <label className={styles.label}>
                      PlatformHub 地址
                      <input className={styles.input} value={web3Settings?.platformHubAddress || effectiveWeb3Settings.platformHubAddress} onChange={(e) => setByPath('services.web3Publishing.platformHubAddress', e.target.value)} placeholder="0xYOUR_PLATFORM_HUB" />
                    </label>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        默认版税（BPS）
                        <input className={styles.input} type="number" value={web3Settings?.defaultRoyaltyBps || effectiveWeb3Settings.defaultRoyaltyBps} onChange={(e) => setByPath('services.web3Publishing.defaultRoyaltyBps', Number(e.target.value) || DEFAULT_SEPOLIA_CONTRACTS.defaultRoyaltyBps)} />
                      </label>
                      <label className={styles.label}>
                        平台费（BPS，只读）
                        <input className={styles.input} type="number" value={effectiveWeb3Settings.platformFeeBps} readOnly />
                      </label>
                    </div>
                    <div className={styles.row}>
                      <button className={styles.primaryButton} onClick={handlePublish} disabled={busyState !== 'idle'}>
                        通过 PlatformHub 发布作品
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>6. 版税分账配置</div>
                  <div className={styles.cardSub}>PlatformHub 会把这里的分账地址和权重交给 `RoyaltySplitterFactory`，并把生成的 splitter 作为 ERC-2981 版税接收方。</div>
                  <div className={styles.fieldGrid}>
                    {royaltySplits.map((item) => (
                      <div key={item.id} className={styles.splitRow}>
                        <input className={styles.input} value={item.address} onChange={(e) => updateSplit(item.id, { address: e.target.value })} placeholder={`${item.label} wallet address`} />
                        <input className={styles.input} type="number" min={0} max={100} value={item.share} onChange={(e) => updateSplit(item.id, { share: Number(e.target.value) || 0 })} placeholder="share" />
                        <button className={styles.dangerButton} onClick={() => removeSplit(item.id)}>移除</button>
                      </div>
                    ))}
                    <div className={styles.row}>
                      <button className={styles.ghostButton} onClick={addSplit}>添加分账人</button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'flow' && (
              <div className={styles.gridTwo}>
                <section className={styles.card}>
                  <div className={styles.cardTitle}>7. 购买与授权测试</div>
                  <div className={styles.cardSub}>这里直接接入 Sepolia 上的 `buyAccess(tokenId)` 与 `hasAccess(account, tokenId)`，方便你在桌面端验证真实购买流程。</div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.label}>
                      Token ID
                      <input className={styles.input} value={accessCheck.tokenId} onChange={(e) => setAccessCheck((prev) => ({ ...prev, tokenId: e.target.value }))} placeholder="输入要查询或购买的 Token ID" />
                    </label>
                    <div className={styles.row}>
                      <button className={styles.ghostButton} onClick={() => setAccessCheck((prev) => ({ ...prev, tokenId: upload.tokenId || prev.tokenId }))}>
                        使用刚发布的 Token
                      </button>
                      <button className={styles.primaryButton} onClick={handleRefreshAccess} disabled={busyState !== 'idle'}>
                        查询链上授权
                      </button>
                      <button className={styles.primaryButton} onClick={handleBuyAccess} disabled={busyState !== 'idle'}>
                        购买访问权
                      </button>
                    </div>
                    <div className={styles.flowList}>
                      <div className={styles.flowStep}>
                        <div className={styles.flowStepTitle}>当前查询结果</div>
                        <div className={styles.flowStepBody}>
                          Token #{accessCheck.tokenId || 'pending'}{'\n'}
                          Requires purchase: {String(accessCheck.requiresPurchase)}{'\n'}
                          Active: {String(accessCheck.active)}{'\n'}
                          Has access: {String(accessCheck.hasAccess)}
                        </div>
                      </div>
                      <div className={styles.flowStep}>
                        <div className={styles.flowStepTitle}>价格与分账</div>
                        <div className={styles.flowStepBody}>
                          Price: {accessCheck.priceEth || 'pending'} ETH{'\n'}
                          Platform fee: {accessCheck.platformFeeEth || 'pending'} ETH{'\n'}
                          Creator proceeds: {accessCheck.creatorProceedsEth || 'pending'} ETH
                        </div>
                      </div>
                      <div className={styles.flowStep}>
                        <div className={styles.flowStepTitle}>链上地址</div>
                        <div className={styles.flowStepBody}>
                          Creator: {accessCheck.creator || 'pending'}{'\n'}
                          Splitter: {accessCheck.payoutReceiver || 'pending'}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>8. 链上 + IPFS + 后端的真实分工</div>
                  <div className={styles.flowList}>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>1. 链上存什么</div>
                      <div className={styles.flowStepBody}>
                        链上只保存 tokenURI、版税接收方、分账地址、售价、是否需要购买，以及 `hasAccess(user, tokenId)` 这类授权结果。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>2. IPFS 存什么</div>
                      <div className={styles.flowStepBody}>
                        metadata JSON、封面和音频正文放在 IPFS。公开作品可直接放明文音频，付费作品更推荐放加密后的音频对象。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>3. 后端怎么参与</div>
                      <div className={styles.flowStepBody}>
                        你的外围服务器用 SIWE 识别用户身份，读取 `hasAccess`、`ownerOf` 等链上状态，通过后再发放 Pinata signed URL 或音频解密材料。
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          <aside className={styles.aside}>
            <section className={styles.asideCard}>
              <div className={styles.cardTitle}>发布检查清单</div>
              <div className={styles.checklist}>
                {steps.map((step) => (
                  <div key={step.label} className={styles.checkItem}>
                    <span className={`${styles.dot} ${step.done ? styles.dotDone : ''}`} />
                    <span>{step.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.asideCard}>
              <div className={styles.cardTitle}>IPFS 与链上结果</div>
              <div className={styles.statusList}>
                <div className={styles.statusItem}>
                  <div className={styles.statusTitle}>Audio CID</div>
                  <div className={`${styles.statusValue} ${styles.monospace}`}>{upload.audioCid || 'pending'}</div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusTitle}>Metadata URI</div>
                  <div className={`${styles.statusValue} ${styles.monospace}`}>{upload.metadataUri || 'ipfs://pending'}</div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusTitle}>Token ID / Splitter</div>
                  <div className={`${styles.statusValue} ${styles.monospace}`}>
                    Token #{upload.tokenId || 'pending'}{'\n'}
                    {upload.splitterAddress || 'splitter pending'}
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusTitle}>Publish / Purchase Tx</div>
                  <div className={`${styles.statusValue} ${styles.monospace}`}>
                    {upload.publishTxHash || 'publish pending'}{'\n'}
                    {upload.purchaseTxHash || 'purchase pending'}
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusTitle}>授权查询</div>
                  <div className={styles.statusValue}>{accessCheck.lastUpdated}</div>
                </div>
              </div>
            </section>

            <section className={styles.asideCard}>
              <div className={styles.cardTitle}>流程日志</div>
              <div className={styles.statusList}>
                {statusLog.map((item) => (
                  <div key={item} className={styles.statusItem}>
                    <div className={styles.statusValue}>{item}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </ViewShell>
    </div>
  );
}
