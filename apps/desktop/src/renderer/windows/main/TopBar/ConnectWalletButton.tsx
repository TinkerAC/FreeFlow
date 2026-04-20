import React from 'react';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import { profileContext } from '@renderer/core/electronContextApi';
import styles from './TopBar.module.css';

export default function Web3Button() {
  const { address, isConnected } = useWalletRuntimeState()

  return (
    <button
      onClick={() => profileContext.restartToGuide()}
      className={styles.iconBtn}
      title={isConnected ? `重启并切换 Profile: ${address?.slice(0, 6)}...` : '重启并选择 Profile'}
    >
      <i
        className="fa-solid fa-wallet"
        style={isConnected ? { color: 'rgb(var(--md-sys-color-primary))' } : undefined}
      />
    </button>
  )
}
