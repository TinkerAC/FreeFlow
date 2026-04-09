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
