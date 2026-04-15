import { app, ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import {
  ensureWalletProfile,
  getActiveProfile,
  loadProfileIndex,
} from '@main/core/profileStore';
import { SEPOLIA_CHAIN_ID, type ProfileSummary, type WalletProfileInput } from '@src/shared/profile/profile';

export interface ProfileHandlerOptions {
  rootDataPath: string;
  onEnterProfile?: (profile: ProfileSummary) => Promise<void> | void;
  onExitToGuide?: () => Promise<void> | void;
}

function relaunch(): void {
  setTimeout(() => {
    app.relaunch();
    app.exit(0);
  }, 10);
}

export function registerProfileHandlers(options: ProfileHandlerOptions): void {
  ipcMain.handle(Channels.Profile.List, async () => {
    return loadProfileIndex(options.rootDataPath).profiles;
  });

  ipcMain.handle(Channels.Profile.GetActive, async () => {
    return getActiveProfile(options.rootDataPath);
  });

  ipcMain.handle(Channels.Profile.EnterWalletProfile, async (_evt, input: WalletProfileInput) => {
    if (input.chainId !== SEPOLIA_CHAIN_ID) {
      throw new Error(`Sepolia chain ${SEPOLIA_CHAIN_ID} is required`);
    }

    const profile = ensureWalletProfile(options.rootDataPath, input);
    await options.onEnterProfile?.(profile);
    return profile;
  });

  ipcMain.handle(Channels.Profile.ExitToGuide, async () => {
    if (options.onExitToGuide) {
      await options.onExitToGuide();
      return;
    }

    relaunch();
  });
}
