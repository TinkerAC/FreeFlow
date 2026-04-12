type ApiSuccessEnvelope<TData> = {
  ok: true;
  data: TData;
};

type ApiErrorEnvelope = {
  ok: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type Web25Session = {
  sessionId: string;
  address: string;
  chainId: number;
  nonce: string;
  domain: string;
  uri: string;
  issuedAt: string;
  verifiedAt: string;
};

export type SiweNoncePayload = {
  nonce: string;
  domain: string;
  uri: string;
  statement: string;
  version: '1';
  expiresInSeconds: number;
};

export type PinataUploadPayload = {
  cid: string;
  id: string | null;
  storageObjectId: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  gatewayUrl: string;
};

export type PinataConfigPayload = {
  apiMode: 'server-controlled';
  gatewayBaseUrl: string;
  network: 'public' | 'private';
  groupIdConfigured: boolean;
  maxFileSizeBytes: number;
};

export type CreatorReleaseStatus =
  | 'DRAFT'
  | 'ASSETS_PENDING'
  | 'ASSETS_UPLOADED'
  | 'METADATA_UPLOADED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

export type CreatorReleaseActivity = {
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  at: string;
};

export type CreatorReleaseSplit = {
  id: string;
  label: string;
  address: string;
  share: number;
};

export type StorageObjectRecord = {
  id: string;
  cid: string;
  pinataId: string | null;
  name: string;
  size: number;
  mimeType: string;
  gatewayUrl: string;
  network: string;
  groupId: string | null;
  createdAt: string;
};

export type PlatformDeploymentRecord = {
  id: string;
  chainId: number;
  chainName: string | null;
  deploymentKey: string;
  musicAssetAddress: string;
  royaltySplitterFactoryAddress: string;
  platformHubAddress: string;
};

export type CreatorReleaseRecord = {
  id: string;
  creatorUserId: string;
  title: string;
  artistName: string | null;
  albumName: string | null;
  genreLabel: string | null;
  slug: string;
  description: string | null;
  status: CreatorReleaseStatus;
  currentStage: string;
  accessModel: 'open' | 'purchase';
  previewSeconds: number;
  priceEth: string;
  royaltyBps: number;
  audioSourceName: string | null;
  audioSourcePath: string | null;
  coverSourceName: string | null;
  coverSourcePath: string | null;
  audioStorageObjectId: string | null;
  coverStorageObjectId: string | null;
  metadataStorageObjectId: string | null;
  audioStorageObject: StorageObjectRecord | null;
  coverStorageObject: StorageObjectRecord | null;
  metadataStorageObject: StorageObjectRecord | null;
  platformDeploymentId: string | null;
  platformDeployment: PlatformDeploymentRecord | null;
  splitterAddress: string | null;
  publishTxHash: string | null;
  purchaseTxHash: string | null;
  tokenId: string | null;
  chainId: number | null;
  chainName: string | null;
  explorerUrl: string | null;
  musicAssetAddress: string | null;
  royaltySplitterFactoryAddress: string | null;
  platformHubAddress: string | null;
  metadataDocument: unknown | null;
  royaltySplits: CreatorReleaseSplit[];
  activityLog: CreatorReleaseActivity[];
  statusMessage: string | null;
  latestError: string | null;
  publishedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatorReleaseDashboard = {
  summary: {
    total: number;
    published: number;
    failed: number;
    inProgress: number;
  };
  releases: CreatorReleaseRecord[];
};

let sessionToken: string | null = null;

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function requestWeb25<TData>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<TData> {
  const headers = new Headers(init.headers ?? {});

  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(joinUrl(baseUrl, path), {
    ...init,
    headers,
    credentials: 'include',
  });

  const payload = await response.json().catch((): null => null) as ApiSuccessEnvelope<TData> | ApiErrorEnvelope | null;
  if (!response.ok || !payload?.ok) {
    const message = payload && 'error' in payload
      ? payload.error?.message || payload.error?.code || `HTTP ${response.status}`
      : `HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload.data;
}

export function buildSiweMessage(input: {
  domain: string;
  address: string;
  uri: string;
  statement: string;
  version: '1';
  chainId: number;
  nonce: string;
  issuedAt: string;
}) {
  return [
    `${input.domain} wants you to sign in with your Ethereum account:`,
    input.address,
    '',
    input.statement,
    '',
    `URI: ${input.uri}`,
    `Version: ${input.version}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${input.issuedAt}`,
  ].join('\n');
}

export async function requestSiweNonce(baseUrl: string, input: { address: string; chainId: number }) {
  return await requestWeb25<SiweNoncePayload>(
    baseUrl,
    '/api/v1/auth/siwe/nonce',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function verifySiweSession(baseUrl: string, input: { message: string; signature: string }) {
  const payload = await requestWeb25<{ sessionToken: string; session: Web25Session }>(
    baseUrl,
    '/api/v1/auth/siwe/verify',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  sessionToken = payload.sessionToken;
  return payload;
}

export async function getWeb25Session(baseUrl: string) {
  return await requestWeb25<{ authenticated: boolean; session: Web25Session | null }>(
    baseUrl,
    '/api/v1/auth/session',
  );
}

export async function logoutWeb25(baseUrl: string) {
  const payload = await requestWeb25<{ loggedOut: boolean }>(
    baseUrl,
    '/api/v1/auth/logout',
    {
      method: 'POST',
    },
  );
  sessionToken = null;
  return payload;
}

export async function getPinataConfig(baseUrl: string) {
  return await requestWeb25<PinataConfigPayload>(
    baseUrl,
    '/api/v1/storage/pinata/config',
  );
}

export async function uploadFileToWeb25Pinata(
  baseUrl: string,
  input: {
    file: File;
    name?: string;
    keyvalues?: Record<string, string>;
  },
) {
  const formData = new FormData();
  formData.append('file', input.file);
  if (input.name) {
    formData.append('name', input.name);
  }
  if (input.keyvalues) {
    formData.append('keyvalues', JSON.stringify(input.keyvalues));
  }

  return await requestWeb25<PinataUploadPayload>(
    baseUrl,
    '/api/v1/storage/pinata/files',
    {
      method: 'POST',
      body: formData,
    },
  );
}

export async function listCreatorReleases(baseUrl: string) {
  return await requestWeb25<CreatorReleaseDashboard>(
    baseUrl,
    '/api/v1/releases',
  );
}

export async function createCreatorRelease(
  baseUrl: string,
  input: {
    title?: string;
    artistName?: string;
    accessModel?: 'open' | 'purchase';
  } = {},
) {
  return await requestWeb25<CreatorReleaseRecord>(
    baseUrl,
    '/api/v1/releases',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function getCreatorRelease(baseUrl: string, releaseId: string) {
  return await requestWeb25<CreatorReleaseRecord>(
    baseUrl,
    `/api/v1/releases/${releaseId}`,
  );
}

export async function updateCreatorRelease(
  baseUrl: string,
  releaseId: string,
  input: Record<string, unknown>,
) {
  return await requestWeb25<CreatorReleaseRecord>(
    baseUrl,
    `/api/v1/releases/${releaseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}
