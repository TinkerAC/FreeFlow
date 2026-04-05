import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react'

// 1. 填入你刚才拿到的 Project ID
const WALLETCONNECT_PROJECT_ID = '7d2dc0e176fd6ec135d94b73bc02f036'

// 2. 设置你要用的网络（咱们的 Sepolia 测试网）
const sepolia = {
  chainId: 11155111,
  name: 'Sepolia',
  currency: 'ETH',
  explorerUrl: 'https://sepolia.etherscan.io',
  rpcUrl: 'https://rpc.sepolia.org'
}

// 3. 配置你的软件信息（会显示在用户的手机授权界面上）
const metadata = {
  name: 'Web3 Music Platform',
  description: 'My awesome decentralized Spotify',
  url: 'https://mywebsite.com', // 随便填
  icons: ['https://avatars.mywebsite.com/'] // 随便填
}

// 4. 创建那个炫酷的弹窗实体
createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [sepolia],
  projectId: WALLETCONNECT_PROJECT_ID,
  enableAnalytics: false
})