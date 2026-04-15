export declare const CREATOR_RELEASE_STATUSES: readonly [
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
];

export type CreatorReleaseStatus = (typeof CREATOR_RELEASE_STATUSES)[number];

export declare const CREATOR_RELEASE_CLIENT_UPDATE_STATUSES: readonly [
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
];


export type CreatorReleaseClientUpdateStatus = (typeof CREATOR_RELEASE_CLIENT_UPDATE_STATUSES)[number];

export declare const CREATOR_RELEASE_IN_PROGRESS_STATUSES: readonly [
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
];

export declare const RELEASE_ACCESS_MODELS: readonly ['open', 'purchase'];
export type ReleaseAccessModel = (typeof RELEASE_ACCESS_MODELS)[number];

export declare const RELEASE_ACTIVITY_LEVELS: readonly ['info', 'success', 'warning', 'error'];
export type ReleaseActivityLevel = (typeof RELEASE_ACTIVITY_LEVELS)[number];

export declare const CREATOR_RELEASE_PUBLISHED_STATUS: 'PUBLISHED';
export declare const CREATOR_RELEASE_FAILED_STATUS: 'FAILED';

