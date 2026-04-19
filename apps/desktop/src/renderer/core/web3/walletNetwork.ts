export type RequestingProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type WalletChainConfig = {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency?: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

export function chainIdToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

function parseWalletChainId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  return value.startsWith('0x') ? Number.parseInt(value, 16) : Number(value);
}

function getWalletErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    code?: number;
    data?: { code?: number; originalError?: { code?: number } };
  };
  return candidate.code ?? candidate.data?.code ?? candidate.data?.originalError?.code;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = typeof window !== 'undefined' ? window.setTimeout : setTimeout;
    timer(resolve, ms);
  });
}

export async function getWalletChainId(provider: RequestingProvider): Promise<number | null> {
  return parseWalletChainId(await provider.request({ method: 'eth_chainId' }));
}

export async function ensureWalletChain(
  provider: RequestingProvider,
  chain: WalletChainConfig,
): Promise<number> {
  const targetHex = chainIdToHex(chain.chainId);
  const currentChainId = await getWalletChainId(provider).catch((): null => null);
  if (currentChainId === chain.chainId) return chain.chainId;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }],
    });
  } catch (error) {
    if (getWalletErrorCode(error) !== 4902) {
      throw error;
    }

    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: targetHex,
        chainName: chain.chainName,
        nativeCurrency: chain.nativeCurrency ?? {
          name: 'Sepolia Ether',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: [chain.rpcUrl],
        blockExplorerUrls: [chain.explorerUrl],
      }],
    });

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetHex }],
    });
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const nextChainId = await getWalletChainId(provider).catch((): null => null);
    if (nextChainId === chain.chainId) return chain.chainId;
    await delay(150);
  }

  throw new Error(`钱包网络仍不是 ${chain.chainName}，请在钱包中切换后重试。`);
}
