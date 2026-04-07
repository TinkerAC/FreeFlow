import { useWeb3Modal, useWeb3ModalAccount } from '@web3modal/ethers/react'
import React from 'react';
import styles from './TopBar.module.css';

export default function Web3Button() {
  const { open } = useWeb3Modal() 
  const { address, isConnected } = useWeb3ModalAccount()

  return (
    <button 
      onClick={() => open()} 
      className={styles.iconBtn}
      title={isConnected ? `已连接: ${address?.slice(0, 6)}...` : '链接 Web3 钱包'}
    >
      <i className="fa-solid fa-wallet" style={isConnected ? { color: '#1DB954' } : {}} />
    </button>
  )
}

