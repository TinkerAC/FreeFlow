import { ipcRenderer } from 'electron';

export const configApi = {
  getConfig: <T>(key: string): Promise<T> => ipcRenderer.invoke('get-configContext', key),
  setConfig: <T>(key: string, value: T): Promise<void> => ipcRenderer.invoke('set-configContext', key, value),
};
export type ConfigApi = typeof configApi;