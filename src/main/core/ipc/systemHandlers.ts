import { app, ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { getOperatingSystem } from '@src/utils/helpers';
import { IpcContext } from './ipcContext';

export function registerSystemHandlers(_ctx: IpcContext): void {
  ipcMain.handle(Channels.System.GetPlatform, async () => getOperatingSystem());

  ipcMain.handle(Channels.System.GetAppVersion, () => {
    return app.getVersion();
  });

  ipcMain.handle(Channels.System.GetAppAuthor, () => {
    return 'Tinker';
  });
}

