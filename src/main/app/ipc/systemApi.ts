import { ipcRenderer } from 'electron';

export const systemApi = {
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-systemContext'),
  revealDataBaseInFileSystem: () => ipcRenderer.send('reveal-database-in-file-system'),
  calculateFileCacheDiskUsage:():Promise<number> => ipcRenderer.invoke('calculate-file-cache-disk-usage')
};

export type SystemApi = typeof systemApi;