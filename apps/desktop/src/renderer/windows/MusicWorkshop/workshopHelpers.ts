import type { CreatorReleaseDashboard, CreatorReleaseRecord, CreatorReleaseSplit, PinataConfigPayload } from '@renderer/core/web25/client';

export type AccessModel = 'open' | 'purchase';
export type ReleasePanel = 'editor' | 'storage' | 'publish' | 'access';
export type BusyState =
  | 'idle'
  | 'loading-dashboard'
  | 'uploading-assets'
  | 'uploading-metadata'
  | 'publishing'
  | 'checking-access'
  | 'buying';
export type AutosaveState = 'idle' | 'saving' | 'saved' | 'error';
export type ReleaseFilter = 'all' | 'in-progress' | 'published' | 'failed';

export type AccessCheckState = {
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

export const DEFAULT_ACCESS_CHECK_STATE: AccessCheckState = {
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

export const EMPTY_DASHBOARD: CreatorReleaseDashboard = {
  summary: {
    total: 0,
    published: 0,
    failed: 0,
    inProgress: 0,
  },
  releases: [],
};

export const RELEASE_FILTERS: Array<{ value: ReleaseFilter; label: string }> = [
  { value: 'all', label: '全部项目' },
  { value: 'in-progress', label: '进行中' },
  { value: 'published', label: '已发布' },
  { value: 'failed', label: '失败' },
];

export const PANELS: Array<{ value: ReleasePanel; label: string }> = [
  { value: 'editor', label: '项目编辑' },
  { value: 'storage', label: '存储与 Metadata' },
  { value: 'publish', label: '链上发布' },
  { value: 'access', label: '授权验证' },
];

export function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'untitled-track';
}

export function formatBytes(size?: number) {
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

export function formatRelativeTime(iso: string | null) {
  if (!iso) return '未记录';
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(deltaMs / 60000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.round(hours / 24);
  return `${days} 天前`;
}

export function summarizeDashboard(releases: CreatorReleaseRecord[]): CreatorReleaseDashboard['summary'] {
  return releases.reduce((acc, release) => {
    acc.total += 1;
    if (release.status === 'PUBLISHED') acc.published += 1;
    if (release.status === 'FAILED') acc.failed += 1;
    if (['DRAFT', 'ASSETS_PENDING', 'ASSETS_UPLOADED', 'METADATA_UPLOADED', 'PUBLISHING'].includes(release.status)) {
      acc.inProgress += 1;
    }
    return acc;
  }, {
    total: 0,
    published: 0,
    failed: 0,
    inProgress: 0,
  });
}

export function replaceReleaseInDashboard(
  dashboard: CreatorReleaseDashboard,
  release: CreatorReleaseRecord,
) {
  const nextReleases = dashboard.releases.some((item) => item.id === release.id)
    ? dashboard.releases.map((item) => (item.id === release.id ? release : item))
    : [release, ...dashboard.releases];

  nextReleases.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return {
    summary: summarizeDashboard(nextReleases),
    releases: nextReleases,
  };
}

export function filteredReleases(releases: CreatorReleaseRecord[], filter: ReleaseFilter) {
  switch (filter) {
    case 'published':
      return releases.filter((release) => release.status === 'PUBLISHED');
    case 'failed':
      return releases.filter((release) => release.status === 'FAILED');
    case 'in-progress':
      return releases.filter((release) =>
        ['DRAFT', 'ASSETS_PENDING', 'ASSETS_UPLOADED', 'METADATA_UPLOADED', 'PUBLISHING'].includes(release.status));
    default:
      return releases;
  }
}

export function releaseStatusLabel(status: CreatorReleaseRecord['status']) {
  switch (status) {
    case 'DRAFT':
      return '草稿';
    case 'ASSETS_PENDING':
      return '上传中';
    case 'ASSETS_UPLOADED':
      return '素材已入库';
    case 'METADATA_UPLOADED':
      return 'Metadata 就绪';
    case 'PUBLISHING':
      return '链上发布中';
    case 'PUBLISHED':
      return '已发布';
    case 'FAILED':
      return '失败';
    case 'CANCELLED':
      return '已取消';
    default:
      return status;
  }
}

export function releaseStatusTone(status: CreatorReleaseRecord['status']) {
  switch (status) {
    case 'PUBLISHED':
      return 'success' as const;
    case 'FAILED':
      return 'danger' as const;
    case 'PUBLISHING':
    case 'ASSETS_PENDING':
      return 'warning' as const;
    default:
      return 'neutral' as const;
  }
}

export function defaultSplits(address?: string): CreatorReleaseSplit[] {
  return [
    {
      id: makeId('split'),
      label: 'Primary artist',
      address: address ?? '',
      share: 100,
    },
  ];
}

export function buildMetadataDocument(
  release: CreatorReleaseRecord,
  input: {
    pinataConfig: PinataConfigPayload | null;
    chainName: string;
    platformHubAddress: string;
    musicAssetAddress: string;
    audioMimeType?: string;
    coverMimeType?: string;
  },
) {
  return {
    name: release.title || 'Untitled Track',
    description: release.description || 'Published from FreeFlow Creators Workshop',
    image: release.coverCid ? `ipfs://${release.coverCid}` : '',
    external_url: release.metadataGatewayUrl || '',
    attributes: [
      { trait_type: 'Artist', value: release.artistName || 'Unknown Artist' },
      { trait_type: 'Album', value: release.albumName || 'Single' },
      { trait_type: 'Genre', value: release.genreLabel || 'Unspecified' },
      { trait_type: 'Access Model', value: release.accessModel === 'purchase' ? 'Purchase Required' : 'Open Access' },
      { trait_type: 'Preview Seconds', value: release.previewSeconds },
      { trait_type: 'Royalty BPS', value: release.royaltyBps },
    ],
    properties: {
      media: {
        audio: release.audioCid
          ? {
            uri: `ipfs://${release.audioCid}`,
            gateway: release.audioGatewayUrl,
            mimeType: input.audioMimeType || 'audio/mpeg',
            access: release.accessModel,
          }
          : null,
        cover: release.coverCid
          ? {
            uri: `ipfs://${release.coverCid}`,
            gateway: release.coverGatewayUrl,
            mimeType: input.coverMimeType || 'image/png',
          }
          : null,
      },
      commerce: {
        unlockPriceEth: release.accessModel === 'purchase' ? release.priceEth : '0',
        platformHubAddress: input.platformHubAddress || '0xYOUR_PLATFORM_HUB',
      },
      provenance: {
        storageProvider: 'Pinata',
        pinataGroupId: input.pinataConfig?.groupIdConfigured ? 'configured-on-server' : '',
        chainName: input.chainName,
        musicAssetAddress: input.musicAssetAddress || '0xYOUR_MUSIC_ASSET',
      },
    },
  };
}
