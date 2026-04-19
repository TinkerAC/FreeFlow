import type {
  CreatorReleaseClientUpdateStatus,
  CreatorReleaseStatus,
  ReleaseAccessModel,
} from '@freeflow/web25-shared';
import { readWeb25SessionTokenSnapshot } from './sessionSync';

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

export type Web25UserProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  walletAddress: string | null;
  chainId: number | null;
  updatedAt: string;
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
  accessModel: ReleaseAccessModel;
  previewSeconds: number;
  priceEth: string;
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
  splitterAddress: string | null;
  publishTxHash: string | null;
  publishBlockNumber: string | null;
  tokenId: string | null;
  chainId: number | null;
  chainName: string | null;
  explorerUrl: string | null;
  musicAssetAddress: string | null;
  platformHubAddress: string | null;
  metadataDocument: unknown | null;
  revenueSplits: CreatorReleaseSplit[];
  statusMessage: string | null;
  latestError: string | null;
  publishedAt: string | null;
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

export type DeleteCreatorReleaseResult = {
  releaseId: string;
  deletedStorageUploadCount: number;
  deletedStorageObjectCount: number;
};

export type UpdateCreatorReleasePayload = Record<string, unknown> & {
  status?: CreatorReleaseClientUpdateStatus;
  accessModel?: ReleaseAccessModel;
};

export type IndexedTrackResource = {
  id: string;
  resourceKey: string;
  type: string;
  title: string | null;
  artistName: string | null;
  albumName: string | null;
  genreLabel?: string | null;
  description?: string | null;
  chainId: number | null;
  contractAddress: string | null;
  tokenId: string | null;
  contentCid: string | null;
  coverUrl: string | null;
  coverCid: string | null;
  audioUrl: string | null;
  audioCid: string | null;
  metadataUrl: string | null;
  metadataCid: string | null;
  accessModel: ReleaseAccessModel | null;
  previewSeconds: number | null;
  priceEth: string | null;
  explorerUrl: string | null;
  platformHubAddress: string | null;
  publishTxHash: string | null;
  releaseId: string | null;
  status: CreatorReleaseStatus | null;
  metadataDocument: unknown | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  rank?: {
    algorithm: string;
    score: number;
    reasons: string[];
    features?: Record<string, number>;
  } | null;
};

export type Web25Comment = {
  id: string;
  releaseId: string;
  body: string;
  author: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    walletAddress: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type Web25CommentList = {
  release: {
    id: string;
    title: string | null;
    status: CreatorReleaseStatus;
  };
  items: Web25Comment[];
  nextCursor: string | null;
};

export type Web25PurchaseRecord = {
  id: string;
  releaseId: string;
  buyerUserId: string;
  walletAddress: string;
  chainId: number;
  txHash: string;
  amountWei: string;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

let sessionToken: string | null = null;

export function setWeb25SessionToken(token: string | null) {
  sessionToken = token?.trim() || null;
}

function resolveSessionToken() {
  sessionToken = readWeb25SessionTokenSnapshot();
  return sessionToken;
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function requestWeb25<TData>(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<TData> {
  const headers = new Headers(init.headers ?? {});

  const token = resolveSessionToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
  try {
    return await requestWeb25<{ loggedOut: boolean }>(
      baseUrl,
      '/api/v1/auth/logout',
      {
        method: 'POST',
      },
    );
  } finally {
    sessionToken = null;
  }
}

export async function getCurrentWeb25UserProfile(baseUrl: string) {
  return await requestWeb25<Web25UserProfile>(
    baseUrl,
    '/api/v1/users/me',
  );
}

export async function updateCurrentWeb25UserProfile(
  baseUrl: string,
  input: {
    displayName?: string;
    avatarUrl?: string | null;
  },
) {
  return await requestWeb25<Web25UserProfile>(
    baseUrl,
    '/api/v1/users/me',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export async function uploadWeb25UserAvatar(baseUrl: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return await requestWeb25<Web25UserProfile>(
    baseUrl,
    '/api/v1/users/me/avatar',
    {
      method: 'POST',
      body: formData,
    },
  );
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
    accessModel?: ReleaseAccessModel;
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
  input: UpdateCreatorReleasePayload,
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

export async function deleteCreatorRelease(baseUrl: string, releaseId: string) {
  return await requestWeb25<DeleteCreatorReleaseResult>(
    baseUrl,
    `/api/v1/releases/${releaseId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function searchIndexedTrackResources(baseUrl: string, keyword: string, limit: number = 30) {
  const query = new URLSearchParams({
    q: keyword.trim(),
    limit: String(limit),
  });

  return await requestWeb25<{
    items: IndexedTrackResource[];
    ranking?: {
      algorithm: string;
      candidateCount: number;
      matchedCount: number;
      query: Record<string, unknown>;
    };
  }>(
    baseUrl,
    `/api/v1/resources/search?${query.toString()}`,
  );
}

export async function resolveIndexedTrackResource(baseUrl: string, resourceKey: string) {
  const query = new URLSearchParams({
    resourceKey,
  });

  return await requestWeb25<IndexedTrackResource>(
    baseUrl,
    `/api/v1/resources/resolve?${query.toString()}`,
  );
}

export async function listWeb25Comments(
  baseUrl: string,
  input: {
    releaseId: string;
    limit?: number;
    cursor?: string | null;
  },
) {
  const query = new URLSearchParams({
    releaseId: input.releaseId,
    limit: String(input.limit ?? 30),
  });
  if (input.cursor) query.set('cursor', input.cursor);

  return await requestWeb25<Web25CommentList>(
    baseUrl,
    `/api/v1/comments?${query.toString()}`,
  );
}

export async function createWeb25Comment(
  baseUrl: string,
  input: {
    releaseId: string;
    body: string;
  },
) {
  return await requestWeb25<Web25Comment>(
    baseUrl,
    '/api/v1/comments',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export async function upsertWeb25Purchase(
  baseUrl: string,
  input: {
    releaseId: string;
    walletAddress: string;
    chainId: number;
    txHash: string;
    amountWei: string;
    status?: Web25PurchaseRecord['status'];
    purchasedAt?: string | null;
  },
) {
  return await requestWeb25<Web25PurchaseRecord>(
    baseUrl,
    '/api/v1/purchases',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
