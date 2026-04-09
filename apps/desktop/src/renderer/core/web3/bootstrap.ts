import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import { DEFAULT_SEPOLIA_CONTRACTS } from '@src/shared/web3/freeflowContracts';

const WALLETCONNECT_PROJECT_ID = '7d2dc0e176fd6ec135d94b73bc02f036';

const sepolia = {
  chainId: DEFAULT_SEPOLIA_CONTRACTS.chainId,
  name: DEFAULT_SEPOLIA_CONTRACTS.chainName,
  currency: 'ETH',
  explorerUrl: DEFAULT_SEPOLIA_CONTRACTS.explorerUrl,
  rpcUrl: DEFAULT_SEPOLIA_CONTRACTS.rpcUrl,
};

const metadata = {
  name: 'FreeFlow Creators Workshop',
  description: 'Creator publishing workflow for FreeFlow desktop',
  url: 'https://freeflow.local',
  icons: ['https://freeflow.local/icon.png'],
};

let bootstrapped = false;

export function ensureWeb3Modal() {
  if (bootstrapped) {
    return;
  }

  createWeb3Modal({
    ethersConfig: defaultConfig({ metadata }),
    chains: [sepolia],
    projectId: WALLETCONNECT_PROJECT_ID,
    enableAnalytics: false,
  });

  bootstrapped = true;
}
