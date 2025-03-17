import { ipcRenderer } from 'electron';

export const platformApi = {
  getPlatform: (): Promise<any> => ipcRenderer.invoke('get-platformContext'),
};

export type PlatformApi = typeof platformApi;