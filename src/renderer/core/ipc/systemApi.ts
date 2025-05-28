import { ipcRenderer } from 'electron';
import { AppIcon } from '@src/shared/hifiniCookies';

export const systemApi = {
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-system'),
  revealDataBaseInFileSystem: () => ipcRenderer.send('reveal-database-in-file-system'),
  calculateFileCacheDiskUsage: (): Promise<number> => ipcRenderer.invoke('calculate-file-cache-disk-usage'),
  setAppIcon(appIcon: AppIcon) {
    ipcRenderer.send('set-appIcon', appIcon);
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
};

export type SystemApi = typeof systemApi;