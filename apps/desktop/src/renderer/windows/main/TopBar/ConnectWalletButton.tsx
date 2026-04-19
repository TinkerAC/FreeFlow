import React from 'react';
import { useWalletRuntimeState } from '@renderer/core/web3/useWalletRuntimeState';
import { profileContext } from '@renderer/core/electronContextApi';
import styles from './TopBar.module.css';

export default function Web3Button() {
  const { address, isConnected } = useWalletRuntimeState()

  return (
    <button
      onClick={() => profileContext.exitToGuide()}
      className={styles.iconBtn}
      title={isConnected ? `切换 Profile: ${address?.slice(0, 6)}...` : '返回 Profile 引导'}
    >
      <i
        className="fa-solid fa-wallet"
        style={isConnected ? { color: 'rgb(var(--md-sys-color-primary))' } : undefined}
      />
    </button>
  )
}
