import React from 'react';
import { BrowserProvider, Contract, ZeroAddress, parseEther } from 'ethers';
import { useWeb3Modal, useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { useSettingsContext } from '@renderer/core/config/SettingsContext';
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
  mintTxHash: string;
  premiumTxHash: string;
  tokenId: string;
};

const MUSIC_ASSET_ABI = [
  'function mintTrack(address artist, string tokenURI_, address royaltyReceiver, uint96 feeNumerator) public returns (uint256)',
];

const ROYALTY_SPLITTER_FACTORY_ABI = [
  'function createSplitter(address[] payees, uint256[] shares) public returns (address)',
];

const PLATFORM_HUB_ABI = [
  'function setPremium(uint256 tokenId, bool status, uint256 price) public',
];

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
  mintTxHash: '',
  premiumTxHash: '',
  tokenId: '',
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

function fileToGateway(gateway: string, cid: string) {
  if (!cid) return '';
  const base = gateway.trim().replace(/\/$/, '') || 'https://gateway.pinata.cloud/ipfs';
  return `${base}/${cid}`;
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
  const [statusLog, setStatusLog] = React.useState<string[]>(['等待创作者开始发布流程']);
  const [royaltySplits, setRoyaltySplits] = React.useState<SplitRecipient[]>([
    { id: makeId('split'), label: 'Primary artist', address: '', share: 100 },
  ]);
  const [busyState, setBusyState] = React.useState<'idle' | 'uploading-assets' | 'uploading-metadata' | 'minting'>('idle');

  const pinataSettings = settings?.services.pinata;
  const web3Settings = settings?.services.web3Publishing;

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
    const gateway = pinataSettings?.gateway || 'https://gateway.pinata.cloud/ipfs';
    return {
      name: asset.title || 'Untitled Track',
      description: asset.description || 'Published from FreeFlow Creators Workshop',
      image: upload.coverCid ? `ipfs://${upload.coverCid}` : '',
      external_url: upload.metadataCid ? fileToGateway(gateway, upload.metadataCid) : '',
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
          platformHubAddress: web3Settings?.platformHubAddress || '0xYOUR_PLATFORM_HUB',
        },
        provenance: {
          storageProvider: 'Pinata',
          pinataGroupId: pinataSettings?.groupId || '',
          chainName: web3Settings?.chainName || 'Sepolia',
          musicAssetAddress: web3Settings?.musicAssetAddress || '0xYOUR_MUSIC_ASSET',
        },
      },
    };
  }, [asset, audioFile, coverFile, pinataSettings, upload, web3Settings]);

  const curlPreview = React.useMemo(() => {
    const apiBase = pinataSettings?.apiBaseUrl || 'https://uploads.pinata.cloud/v3/files';
    const authPart = pinataSettings?.useSignedUploads
      ? '# use the signed upload URL returned by your backend'
      : 'Authorization: Bearer <PINATA_JWT>';

    return [
      `curl --request POST "${apiBase}" \\`,
      `  --header "${authPart}" \\`,
      '  --form "network=public" \\',
      `  --form "name=${slugify(asset.title || 'untitled-track')}" \\`,
      '  --form "file=@./your-audio-file.mp3"',
    ].join('\n');
  }, [asset.title, pinataSettings]);

  const uploadFileToPinata = async (file: File, name: string, keyvalues: Record<string, string>) => {
    const apiBase = pinataSettings?.apiBaseUrl || 'https://uploads.pinata.cloud/v3/files';
    const formData = new FormData();
    formData.append('network', pinataSettings?.network || 'public');
    formData.append('name', name);
    formData.append('file', file);
    formData.append('keyvalues', JSON.stringify(keyvalues));

    if (pinataSettings?.groupId) {
      formData.append('group_id', pinataSettings.groupId);
    }

    const headers: Record<string, string> = {};
    if (pinataSettings?.useSignedUploads) {
      if (!pinataSettings.signedUploadUrl) {
        throw new Error('Signed upload URL is empty');
      }
      const response = await fetch(pinataSettings.signedUploadUrl, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error?.reason || result?.message || 'Pinata signed upload failed');
      }
      return result.data || result;
    }

    if (!pinataSettings?.jwt) {
      throw new Error('Pinata JWT is empty');
    }

    headers.Authorization = `Bearer ${pinataSettings.jwt}`;
    const response = await fetch(apiBase, {
      method: 'POST',
      headers,
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error?.reason || result?.message || 'Pinata upload failed');
    }
    return result.data || result;
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
        nextCoverGateway = fileToGateway(pinataSettings?.gateway || '', coverResult.cid);
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
        audioGatewayUrl: fileToGateway(pinataSettings?.gateway || '', audioResult.cid),
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
        metadataGatewayUrl: fileToGateway(pinataSettings?.gateway || '', metadataCid),
        lastAction: 'metadata 已上传，可以进入 NFT 铸造阶段',
      }));
      appendStatus('metadata 已上传，可以进入 NFT 铸造阶段');
      setActiveTab('mint');
    } catch (error) {
      appendStatus(`metadata 上传失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const handleMint = async () => {
    if (!walletProvider) {
      appendStatus('请先连接钱包');
      return;
    }

    if (!upload.metadataUri) {
      appendStatus('请先上传 metadata JSON');
      return;
    }

    if (!web3Settings?.musicAssetAddress || !web3Settings.royaltySplitterFactoryAddress) {
      appendStatus('请先填写 MusicAsset 和 RoyaltySplitterFactory 地址');
      return;
    }

    setBusyState('minting');

    try {
      appendStatus('正在创建版税分账合约...');
      const ethersProvider = new BrowserProvider(walletProvider);
      const signer = await ethersProvider.getSigner();
      const artistAddress = address || await signer.getAddress();

      const normalizedSplits = royaltySplits
        .map((item) => ({
          ...item,
          address: item.address.trim(),
          share: Number(item.share || 0),
        }))
        .filter((item) => item.address && item.share > 0);

      const finalSplits = normalizedSplits.length
        ? normalizedSplits
        : [{ id: makeId('split'), label: 'Primary artist', address: artistAddress, share: 100 }];

      const splitterFactory = new Contract(
        web3Settings.royaltySplitterFactoryAddress,
        ROYALTY_SPLITTER_FACTORY_ABI,
        signer,
      );

      const predictedSplitterAddress = await splitterFactory.createSplitter.staticCall(
        finalSplits.map((item) => item.address),
        finalSplits.map((item) => item.share),
      );
      const createSplitterTx = await splitterFactory.createSplitter(
        finalSplits.map((item) => item.address),
        finalSplits.map((item) => item.share),
      );
      await createSplitterTx.wait();
      const splitterAddress = predictedSplitterAddress || ZeroAddress;
      appendStatus(`分账合约已创建：${splitterAddress}`);

      const musicAsset = new Contract(web3Settings.musicAssetAddress, MUSIC_ASSET_ABI, signer);
      const predictedTokenId = await musicAsset.mintTrack.staticCall(
        artistAddress,
        upload.metadataUri,
        splitterAddress,
        asset.royaltyBps,
      );

      appendStatus('正在铸造 Music NFT...');
      const mintTx = await musicAsset.mintTrack(
        artistAddress,
        upload.metadataUri,
        splitterAddress,
        asset.royaltyBps,
      );
      await mintTx.wait();

      let premiumTxHash = '';
      if (asset.accessModel === 'purchase' && web3Settings.platformHubAddress && asset.priceEth) {
        appendStatus('正在配置 PlatformHub 购买门槛...');
        const platformHub = new Contract(web3Settings.platformHubAddress, PLATFORM_HUB_ABI, signer);
        const premiumTx = await platformHub.setPremium(predictedTokenId, true, parseEther(asset.priceEth));
        await premiumTx.wait();
        premiumTxHash = premiumTx.hash;
      }

      setUpload((prev) => ({
        ...prev,
        splitterAddress,
        mintTxHash: mintTx.hash,
        premiumTxHash,
        tokenId: predictedTokenId.toString(),
        lastAction: 'NFT 铸造完成，可以向粉丝公布 metadata URI 与合约地址',
      }));
      appendStatus('NFT 铸造完成，可以向粉丝公布 metadata URI 与合约地址');
    } catch (error) {
      appendStatus(`铸造失败：${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusyState('idle');
    }
  };

  const steps = [
    { label: '选择音频文件', done: !!audioFile },
    { label: '准备封面与文案', done: !!coverFile && !!asset.title },
    { label: '上传音频 / 封面到 Pinata', done: !!upload.audioCid },
    { label: '上传 metadata JSON', done: !!upload.metadataCid },
    { label: '创建版税分账并铸造 NFT', done: !!upload.mintTxHash },
    { label: '配置购买门槛', done: asset.accessModel === 'open' || !!upload.premiumTxHash },
  ];

  const header = (
    <div className={styles.header}>
      <div className={styles.headerCopy}>
        <div className={styles.title}>Creators Workshop</div>
        <div className={styles.subtitle}>
          在一个独立窗口里完成歌手发布流程：整理作品素材、接入 Pinata、存储到 IPFS、创建版税分账并铸造 NFT。
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
                <span className={styles.badge}>Chain: {web3Settings?.chainName || 'Sepolia'}</span>
                <span className={styles.badge}>Access: {asset.accessModel === 'purchase' ? 'Purchase Required' : 'Open Access'}</span>
                <span className={styles.badge}>Pinata: {pinataSettings?.useSignedUploads ? 'Signed URL' : 'JWT Upload'}</span>
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
                    当前实现采用 Pinata 文档推荐的 files endpoint 方式。桌面端允许你直接填 JWT，生产环境更推荐改成后端签发 signed upload URL。
                  </div>
                  <div className={styles.fieldGrid}>
                    <label className={styles.label}>
                      Pinata JWT
                      <input className={styles.input} value={pinataSettings?.jwt || ''} onChange={(e) => setByPath('services.pinata.jwt', e.target.value)} placeholder="pinata_jwt_placeholder" />
                    </label>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        Gateway
                        <input className={styles.input} value={pinataSettings?.gateway || ''} onChange={(e) => setByPath('services.pinata.gateway', e.target.value)} placeholder="https://gateway.pinata.cloud/ipfs" />
                      </label>
                      <label className={styles.label}>
                        API Base URL
                        <input className={styles.input} value={pinataSettings?.apiBaseUrl || ''} onChange={(e) => setByPath('services.pinata.apiBaseUrl', e.target.value)} />
                      </label>
                    </div>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        Network
                        <select className={styles.select} value={pinataSettings?.network || 'public'} onChange={(e) => setByPath('services.pinata.network', e.target.value)}>
                          <option value="public">public</option>
                          <option value="private">private</option>
                        </select>
                      </label>
                      <label className={styles.label}>
                        Group ID
                        <input className={styles.input} value={pinataSettings?.groupId || ''} onChange={(e) => setByPath('services.pinata.groupId', e.target.value)} placeholder="optional_group_id" />
                      </label>
                    </div>
                    <div className={styles.row}>
                      <button className={styles.ghostButton} onClick={() => setByPath('services.pinata.useSignedUploads', !(pinataSettings?.useSignedUploads || false))}>
                        {pinataSettings?.useSignedUploads ? '改为直接 JWT 上传' : '切换为 Signed URL 上传'}
                      </button>
                    </div>
                    {pinataSettings?.useSignedUploads && (
                      <label className={styles.label}>
                        Signed Upload URL
                        <input className={styles.input} value={pinataSettings?.signedUploadUrl || ''} onChange={(e) => setByPath('services.pinata.signedUploadUrl', e.target.value)} placeholder="https://your-backend.example.com/pinata/signed-url" />
                      </label>
                    )}
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
                  <div className={styles.cardTitle}>5. 合约配置</div>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldGridTwo}>
                      <label className={styles.label}>
                        链名称
                        <input className={styles.input} value={web3Settings?.chainName || ''} onChange={(e) => setByPath('services.web3Publishing.chainName', e.target.value)} />
                      </label>
                      <label className={styles.label}>
                        Chain ID
                        <input className={styles.input} type="number" value={web3Settings?.chainId || 11155111} onChange={(e) => setByPath('services.web3Publishing.chainId', Number(e.target.value) || 11155111)} />
                      </label>
                    </div>
                    <label className={styles.label}>
                      MusicAsset 地址
                      <input className={styles.input} value={web3Settings?.musicAssetAddress || ''} onChange={(e) => setByPath('services.web3Publishing.musicAssetAddress', e.target.value)} placeholder="0xYOUR_MUSIC_ASSET" />
                    </label>
                    <label className={styles.label}>
                      RoyaltySplitterFactory 地址
                      <input className={styles.input} value={web3Settings?.royaltySplitterFactoryAddress || ''} onChange={(e) => setByPath('services.web3Publishing.royaltySplitterFactoryAddress', e.target.value)} placeholder="0xYOUR_SPLITTER_FACTORY" />
                    </label>
                    <label className={styles.label}>
                      PlatformHub 地址
                      <input className={styles.input} value={web3Settings?.platformHubAddress || ''} onChange={(e) => setByPath('services.web3Publishing.platformHubAddress', e.target.value)} placeholder="0xYOUR_PLATFORM_HUB" />
                    </label>
                    <div className={styles.row}>
                      <button className={styles.primaryButton} onClick={handleMint} disabled={busyState !== 'idle'}>
                        创建 Splitter 并铸造 NFT
                      </button>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>6. 版税分账配置</div>
                  <div className={styles.cardSub}>这里先配置收益分账地址和权重。示例里仍沿用当前合约的 `createSplitter(address[], shares[])` 方式。</div>
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
                  <div className={styles.cardTitle}>创作者内容应如何存储到链和 IPFS</div>
                  <div className={styles.flowList}>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>A. 公开元数据</div>
                      <div className={styles.flowStepBody}>
                        封面、标题、歌手、简介、试听信息、作品属性和发行策略应进入 metadata JSON，作为 tokenURI 的核心内容。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>B. 音频文件存储</div>
                      <div className={styles.flowStepBody}>
                        公开作品可以把完整音频直接 pin 到 IPFS。付费作品更推荐先在客户端或后端加密音频，再把密文 pin 到 IPFS，把解密权限交给后端或授权服务。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>C. 链上职责</div>
                      <div className={styles.flowStepBody}>
                        链上只负责 tokenURI、版税、分账和购买门槛。不要把完整音频本体直接写到链上，成本高且没有必要。
                      </div>
                    </div>
                  </div>
                </section>

                <section className={styles.card}>
                  <div className={styles.cardTitle}>用户购买后如何便利地获取资源</div>
                  <div className={styles.flowList}>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>1. 用户在 PlatformHub 上购买权限</div>
                      <div className={styles.flowStepBody}>
                        前端调用 `buyAccess(tokenId)`。合约只负责收款、分账与写入 `hasAccess(user, tokenId)`。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>2. 后端验证链上权限</div>
                      <div className={styles.flowStepBody}>
                        外围服务器读取链上状态，确认用户已购买或拥有 NFT，再返回 Pinata signed gateway URL，或者返回音频解密密钥。
                      </div>
                    </div>
                    <div className={styles.flowStep}>
                      <div className={styles.flowStepTitle}>3. 客户端拉取完整音频</div>
                      <div className={styles.flowStepBody}>
                        如果资源是公开 IPFS 文件，客户端直接通过网关下载；如果资源是加密文件，客户端用后端颁发的密钥完成解密再播放。
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
