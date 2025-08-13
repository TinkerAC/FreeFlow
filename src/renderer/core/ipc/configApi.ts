import { ipcRenderer } from 'electron';
import { Settings } from '@src/shared/settings/schema';

export const configApi = {
  // 旧接口（保留）
  getConfig: <T>(key: string): Promise<T> => ipcRenderer.invoke('get-config', key),
  setConfig: <T>(key: string, value: T): Promise<void> => ipcRenderer.invoke('set-config', key, value),

  // 新接口
  getAll: (): Promise<Settings> => ipcRenderer.invoke('config:getAll'),
  get: (key: string): Promise<any> => ipcRenderer.invoke('config:get', key),
  set: (key: string, value: any): Promise<void> => ipcRenderer.invoke('config:set', { key, value }),
  setByPath: (path: string, value: any): Promise<void> => ipcRenderer.invoke('config:setByPath', { path, value }),
  patch: (partial: Partial<Settings>): Promise<void> => ipcRenderer.invoke('config:patch', partial),

  subscribe: (cb: (s: Settings) => void) => {
    const handler = (_: any, s: Settings) => cb(s);
    ipcRenderer.on('config:changed', handler);
    return () => ipcRenderer.removeListener('config:changed', handler);
  },
};
export type ConfigApi = typeof configApi;