import React from 'react';
import { BrowserProvider } from 'ethers';
import {
  buildSiweMessage,
  getWeb25Session,
  logoutWeb25,
  requestSiweNonce,
  verifySiweSession,
  type Web25Session,
} from './client';
import {
  readWeb25SessionSnapshot,
  clearWeb25SessionSnapshots,
  subscribeWeb25SessionSnapshot,
  writeWeb25SessionSnapshot,
  type Web25SessionClearScope,
} from './sessionSync';

type WalletProviderLike = ConstructorParameters<typeof BrowserProvider>[0];

type LoginInput = {
  baseUrl: string;
  walletProvider: WalletProviderLike;
  fallbackAddress?: string | null;
};

export async function refreshWeb25Session(baseUrl: string) {
  const payload = await getWeb25Session(baseUrl);
  writeWeb25SessionSnapshot(payload.session);
  return payload.session;
}

export async function loginWeb25WithSiwe(input: LoginInput) {
  const provider = new BrowserProvider(input.walletProvider);
  const signer = await provider.getSigner();
  const signerAddress = input.fallbackAddress || await signer.getAddress();
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const noncePayload = await requestSiweNonce(input.baseUrl, { address: signerAddress, chainId });
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
  const verified = await verifySiweSession(input.baseUrl, { message, signature });
  writeWeb25SessionSnapshot(verified.session);
  return verified.session;
}

export async function logoutWeb25Session(
  baseUrl: string,
  options: { clearLocalScope?: Web25SessionClearScope } = {},
) {
  try {
    await logoutWeb25(baseUrl);
  } catch {
    // Local cleanup still applies when backend logout fails (offline/restart scenarios).
  } finally {
    clearWeb25SessionSnapshots(options.clearLocalScope ?? 'all-profiles');
  }
}

export function useWeb25SessionState(baseUrl: string) {
  const [session, setSession] = React.useState<Web25Session | null>(() => readWeb25SessionSnapshot());
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    return subscribeWeb25SessionSnapshot((next) => setSession(next));
  }, []);

  const refresh = React.useCallback(async () => {
    if (!baseUrl) return null;
    setRefreshing(true);
    try {
      return await refreshWeb25Session(baseUrl);
    } finally {
      setRefreshing(false);
    }
  }, [baseUrl]);

  return {
    session,
    refresh,
    refreshing,
  };
}
