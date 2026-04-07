import { useWeb3Modal, useWeb3ModalAccount } from '@web3modal/ethers/react'
import React from 'react';

export default function Web3Button() {
  const { open } = useWeb3Modal() 
  const { address, isConnected } = useWeb3ModalAccount()

  return (
    <button 
      onClick={() => open()} // 点击直接呼出二维码弹窗！
      style={{ padding: '10px 20px', borderRadius: '20px', backgroundColor: '#1DB954', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
    >
      {isConnected ? `已连接: ${address?.slice(0, 6)}...` : '链接 Web3 钱包'}
    </button>
  )
}

