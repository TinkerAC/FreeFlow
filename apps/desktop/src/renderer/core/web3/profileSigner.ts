import { BrowserProvider, type JsonRpcSigner } from 'ethers';
import { DEFAULT_SEPOLIA_CONTRACTS } from '@src/shared/web3/freeflowContracts';
import { ensureWalletChain, type RequestingProvider, type WalletChainConfig } from './walletNetwork';

type WalletProviderLike = ConstructorParameters<typeof BrowserProvider>[0];

export const REQUIRED_SEPOLIA_CHAIN: WalletChainConfig = {
  chainId: DEFAULT_SEPOLIA_CONTRACTS.chainId,
  chainName: DEFAULT_SEPOLIA_CONTRACTS.chainName,
  rpcUrl: DEFAULT_SEPOLIA_CONTRACTS.rpcUrl,
  explorerUrl: DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

export type ProfileSignerResult = {
  provider: BrowserProvider;
  signer: JsonRpcSigner;
  signerAddress: string;
};

export async function getProfileSigner(
  walletProvider: WalletProviderLike,
  expectedAddress?: string | null,
): Promise<ProfileSignerResult> {
  const injectedProvider = walletProvider as RequestingProvider;
  await injectedProvider.request({ method: 'eth_requestAccounts' }).catch((): null => null);
  await ensureWalletChain(injectedProvider, REQUIRED_SEPOLIA_CHAIN);

  const provider = new BrowserProvider(walletProvider);
  const signer = expectedAddress
    ? await provider.getSigner(expectedAddress)
    : await provider.getSigner();
  const signerAddress = await signer.getAddress();

  if (expectedAddress && signerAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(
      `当前签名钱包 ${signerAddress} 与目标账户 ${expectedAddress} 不一致，请在钱包中切换后重试。`,
    );
  }

  return { provider, signer, signerAddress };
}
