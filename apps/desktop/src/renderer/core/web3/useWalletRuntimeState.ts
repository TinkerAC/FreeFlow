import React from 'react';
import { useWeb3ModalAccount, useWeb3ModalProvider } from '@web3modal/ethers/react';
import { getWalletAddress } from '@renderer/core/profile/profileIdentity';
import type { RequestingProvider } from './walletNetwork';

type WalletProviderLike = {
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  request?: RequestingProvider['request'];
  selectedAddress?: string | null;
};

function parseChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const next = text.startsWith('0x') ? Number.parseInt(text, 16) : Number(text);
  return Number.isFinite(next) ? next : null;
}

export function useWalletRuntimeState() {
  const account = useWeb3ModalAccount();
  const { walletProvider } = useWeb3ModalProvider();
  const [runtimeAddress, setRuntimeAddress] = React.useState<string>(() => getWalletAddress(account.address));
  const [runtimeChainId, setRuntimeChainId] = React.useState<number | null>(() => (
    typeof account.chainId === 'number' ? account.chainId : parseChainId(account.chainId)
  ));
  const [runtimeConnected, setRuntimeConnected] = React.useState<boolean>(Boolean(account.isConnected));

  const resolveRuntimeAddress = React.useCallback(
    (provider: WalletProviderLike | undefined, accounts: string[]) => {
      const selected = getWalletAddress(provider?.selectedAddress);
      if (selected) return selected;

      const hookAddress = getWalletAddress(account.address);
      if (hookAddress && accounts.some((item) => getWalletAddress(item) === hookAddress)) {
        return hookAddress;
      }

      return getWalletAddress(accounts[0]);
    },
    [account.address],
  );

  const refreshRuntimeState = React.useCallback(async () => {
    const provider = walletProvider as WalletProviderLike | undefined;
    const request = provider?.request;
    if (!request) {
      setRuntimeAddress(getWalletAddress(account.address));
      setRuntimeChainId(typeof account.chainId === 'number' ? account.chainId : parseChainId(account.chainId));
      setRuntimeConnected(Boolean(account.isConnected));
      return;
    }

    try {
      const [accountsRaw, chainIdRaw] = await Promise.all([
        request({ method: 'eth_accounts' }).catch((): unknown => []),
        request({ method: 'eth_chainId' }).catch((): unknown => null),
      ]);
      const accounts = Array.isArray(accountsRaw)
        ? accountsRaw.filter((item): item is string => typeof item === 'string')
        : [];
      setRuntimeAddress(resolveRuntimeAddress(provider, accounts));
      setRuntimeChainId(parseChainId(chainIdRaw));
      setRuntimeConnected(accounts.length > 0);
    } catch {
      setRuntimeAddress(getWalletAddress(account.address));
      setRuntimeChainId(typeof account.chainId === 'number' ? account.chainId : parseChainId(account.chainId));
      setRuntimeConnected(Boolean(account.isConnected));
    }
  }, [account.address, account.chainId, account.isConnected, resolveRuntimeAddress, walletProvider]);

  React.useEffect(() => {
    void refreshRuntimeState();
  }, [refreshRuntimeState]);

  React.useEffect(() => {
    const provider = walletProvider as WalletProviderLike | undefined;
    if (!provider?.on || !provider?.removeListener) return;

    const onAccountsChanged = (accountsRaw: unknown) => {
      const accounts = Array.isArray(accountsRaw)
        ? accountsRaw.filter((item): item is string => typeof item === 'string')
        : [];
      setRuntimeAddress(resolveRuntimeAddress(provider, accounts));
      setRuntimeConnected(accounts.length > 0);
    };
    const onChainChanged = (chainIdRaw: unknown) => {
      setRuntimeChainId(parseChainId(chainIdRaw));
    };
    const onDisconnect = () => {
      setRuntimeConnected(false);
      setRuntimeAddress('');
    };

    provider.on('accountsChanged', onAccountsChanged);
    provider.on('chainChanged', onChainChanged);
    provider.on('disconnect', onDisconnect);

    return () => {
      provider.removeListener?.('accountsChanged', onAccountsChanged);
      provider.removeListener?.('chainChanged', onChainChanged);
      provider.removeListener?.('disconnect', onDisconnect);
    };
  }, [resolveRuntimeAddress, walletProvider]);

  React.useEffect(() => {
    const onFocus = () => {
      void refreshRuntimeState();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refreshRuntimeState();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshRuntimeState();
      }
    }, 3000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refreshRuntimeState]);

  return {
    address: runtimeAddress || getWalletAddress(account.address),
    chainId: runtimeChainId ?? (typeof account.chainId === 'number' ? account.chainId : parseChainId(account.chainId)),
    isConnected: runtimeConnected || Boolean(account.isConnected),
    walletProvider,
  };
}
