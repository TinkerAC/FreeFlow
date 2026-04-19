import React from 'react';
import { BrowserProvider } from 'ethers';
import { ensureWalletChain, getWalletChainId, type RequestingProvider, type WalletChainConfig } from '@renderer/core/web3/walletNetwork';
import {
  buildSiweMessage,
  getWeb25Session,
  logoutWeb25,
  requestSiweNonce,
  setWeb25SessionToken,
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
  expectedAddress?: string | null;
  requiredChain?: WalletChainConfig;
};

type RefreshInput = {
  expectedAddress?: string | null;
  expectedChainId?: number | null;
};

function sessionMatchesExpected(session: Web25Session | null, input: RefreshInput = {}) {
  if (!session) return true;
  if (input.expectedAddress && session.address.toLowerCase() !== input.expectedAddress.toLowerCase()) return false;
  if (input.expectedChainId && session.chainId !== input.expectedChainId) return false;
  return true;
}

export async function refreshWeb25Session(baseUrl: string, input: RefreshInput = {}) {
  const payload = await getWeb25Session(baseUrl);
  if (!sessionMatchesExpected(payload.session, input)) {
    writeWeb25SessionSnapshot(null, null);
    return null;
  }
  writeWeb25SessionSnapshot(payload.session);
  return payload.session;
}

export async function loginWeb25WithSiwe(input: LoginInput) {
  const injectedProvider = input.walletProvider as RequestingProvider;
  const expectedAddress = input.expectedAddress?.toLowerCase();

  let requestedAccounts = await injectedProvider.request({ method: 'eth_requestAccounts' })
    .catch((): null => null);
  let accounts = Array.isArray(requestedAccounts)
    ? requestedAccounts.filter((item): item is string => typeof item === 'string')
    : [];
  if (expectedAddress && accounts.length > 0 && !accounts.some((item) => item.toLowerCase() === expectedAddress)) {
    throw new Error(
      `当前钱包没有暴露目标账户 ${input.expectedAddress}。当前钱包返回账户: ${accounts.join(', ')}。请在钱包中切换账户后重试。`,
    );
  }

  const chainId = input.requiredChain
    ? await ensureWalletChain(injectedProvider, input.requiredChain)
    : await getWalletChainId(injectedProvider);
  if (!chainId) {
    throw new Error('无法读取当前钱包网络。');
  }

  requestedAccounts = await injectedProvider.request({ method: 'eth_requestAccounts' })
    .catch((): null => null);
  accounts = Array.isArray(requestedAccounts)
    ? requestedAccounts.filter((item): item is string => typeof item === 'string')
    : accounts;
  if (expectedAddress && accounts.length > 0 && !accounts.some((item) => item.toLowerCase() === expectedAddress)) {
    throw new Error(
      `当前钱包没有暴露目标账户 ${input.expectedAddress}。当前钱包返回账户: ${accounts.join(', ')}。请在钱包中切换账户后重试。`,
    );
  }

  const provider = new BrowserProvider(input.walletProvider);
  const signer = expectedAddress
    ? await provider.getSigner(input.expectedAddress!)
    : await provider.getSigner();
  const signerAddress = await signer.getAddress();
  if (expectedAddress && expectedAddress !== signerAddress.toLowerCase()) {
    const connected = accounts.length ? ` 当前钱包返回账户: ${accounts.join(', ')}。` : '';
    throw new Error(
      `当前签名账户 ${signerAddress} 与目标账户 ${input.expectedAddress} 不一致。${connected}请在钱包中切换账户后重试。`,
    );
  }

  const siweChainId = input.requiredChain
    ? await ensureWalletChain(injectedProvider, input.requiredChain)
    : chainId;

  const noncePayload = await requestSiweNonce(input.baseUrl, { address: signerAddress, chainId: siweChainId });
  const message = buildSiweMessage({
    domain: noncePayload.domain,
    address: signerAddress,
    uri: noncePayload.uri,
    statement: noncePayload.statement,
    version: noncePayload.version,
    chainId: siweChainId,
    nonce: noncePayload.nonce,
    issuedAt: new Date().toISOString(),
  });
  const signature = await signer.signMessage(message);
  const verified = await verifySiweSession(input.baseUrl, { message, signature });
  writeWeb25SessionSnapshot(verified.session, verified.sessionToken);
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
    setWeb25SessionToken(null);
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
