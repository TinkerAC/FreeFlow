import { app, ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { IpcContext } from './ipcContext';

export function registerProfileHandlers({ profileManager }: IpcContext): void {
  ipcMain.handle(Channels.Profile.List, async () => {
    return profileManager.listProfiles();
  });

  ipcMain.handle(Channels.Profile.GetActive, async () => {
    return profileManager.getActiveProfile();
  });

  ipcMain.handle(
    Channels.Profile.Create,
    async (_evt, payload: { id?: string; name?: string } | undefined) => {
      return profileManager.createProfile(payload ?? {});
    },
  );

  ipcMain.handle(Channels.Profile.Switch, async (_evt, profileId: string) => {
    const result = profileManager.switchProfile(profileId);
    if (result.relaunchRequired) {
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 10);
    }
    return result;
  });
}

