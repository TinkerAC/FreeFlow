export const CREATOR_RELEASE_STATUSES = Object.freeze([
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
  'PUBLISHED',
  'FAILED',
  'CANCELLED',
]);

export const CREATOR_RELEASE_CLIENT_UPDATE_STATUSES = CREATOR_RELEASE_STATUSES;

export const CREATOR_RELEASE_IN_PROGRESS_STATUSES = Object.freeze([
  'DRAFT',
  'ASSETS_PENDING',
  'ASSETS_UPLOADED',
  'METADATA_UPLOADED',
  'PUBLISHING',
]);

export const RELEASE_ACCESS_MODELS = Object.freeze([
  'open',
  'purchase',
]);

export const RELEASE_ACTIVITY_LEVELS = Object.freeze([
  'info',
  'success',
  'warning',
  'error',
]);

export const CREATOR_RELEASE_PUBLISHED_STATUS = 'PUBLISHED';
export const CREATOR_RELEASE_FAILED_STATUS = 'FAILED';
