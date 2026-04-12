import {
  CREATOR_RELEASE_FAILED_STATUS,
  CREATOR_RELEASE_IN_PROGRESS_STATUSES,
  CREATOR_RELEASE_PUBLISHED_STATUS,
  type ReleaseAccessModel,
} from '@freeflow/web25-shared';
import type { CreatorReleaseDashboard, CreatorReleaseRecord, CreatorReleaseSplit, PinataConfigPayload } from '@renderer/core/web25/client';

export type AccessModel = ReleaseAccessModel;
export type ReleasePanel = 'editor' | 'storage' | 'publish' | 'access';
export type WorkshopSection = 'dashboard' | ReleasePanel | 'activity';
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

const IN_PROGRESS_STATUS_SET = new Set<CreatorReleaseRecord['status']>(CREATOR_RELEASE_IN_PROGRESS_STATUSES);

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

export const WORKSHOP_NAV_ITEMS: Array<{
  value: WorkshopSection;
  label: string;
  description: string;
  requiresRelease?: boolean;
}> = [
  { value: 'dashboard', label: '工作台', description: '项目总览、发布进度和服务状态' },
  { value: 'editor', label: '项目资料', description: '作品信息、定价和本地素材', requiresRelease: true },
  { value: 'storage', label: '素材存储', description: 'Pinata 上传、CID 和 Metadata', requiresRelease: true },
  { value: 'publish', label: '链上发布', description: '分账配置与发布交易', requiresRelease: true },
  { value: 'access', label: '授权交易', description: '购买权限、价格和链上授权', requiresRelease: true },
  { value: 'activity', label: '日志与产物', description: '恢复检查、交易哈希和活动记录', requiresRelease: true },
];

export function isReleasePanel(value: WorkshopSection): value is ReleasePanel {
  return PANELS.some((panel) => panel.value === value);
}

export function normalizeReleasePanel(value?: string | null): ReleasePanel {
  return PANELS.some((panel) => panel.value === value) ? (value as ReleasePanel) : 'editor';
}

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
    if (release.status === CREATOR_RELEASE_PUBLISHED_STATUS) acc.published += 1;
    if (release.status === CREATOR_RELEASE_FAILED_STATUS) acc.failed += 1;
    if (IN_PROGRESS_STATUS_SET.has(release.status)) {
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
      return releases.filter((release) => release.status === CREATOR_RELEASE_PUBLISHED_STATUS);
    case 'failed':
      return releases.filter((release) => release.status === CREATOR_RELEASE_FAILED_STATUS);
    case 'in-progress':
      return releases.filter((release) => IN_PROGRESS_STATUS_SET.has(release.status));
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

export function metadataUriForRelease(release: CreatorReleaseRecord) {
  return release.metadataStorageObject ? `ipfs://${release.metadataStorageObject.cid}` : '';
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
    image: release.coverStorageObject ? `ipfs://${release.coverStorageObject.cid}` : '',
    external_url: release.metadataStorageObject?.gatewayUrl || '',
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
        audio: release.audioStorageObject
          ? {
            uri: `ipfs://${release.audioStorageObject.cid}`,
            gateway: release.audioStorageObject.gatewayUrl,
            mimeType: input.audioMimeType || release.audioStorageObject.mimeType || 'audio/mpeg',
            access: release.accessModel,
          }
          : null,
        cover: release.coverStorageObject
          ? {
            uri: `ipfs://${release.coverStorageObject.cid}`,
            gateway: release.coverStorageObject.gatewayUrl,
            mimeType: input.coverMimeType || release.coverStorageObject.mimeType || 'image/png',
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
