import { ipcRenderer } from 'electron';

export const configApi = {
  getConfig: <T>(key: string): Promise<T> => ipcRenderer.invoke('get-config', key),
  setConfig: <T>(key: string, value: T): Promise<void> => ipcRenderer.invoke('set-config', key, value),
};
export type ConfigApi = typeof configApi;