import { ipcRenderer } from 'electron';

export const platformApi = {
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platformContext'),
  revealDataBaseInFileSystem: () => ipcRenderer.send('reveal-database-in-file-system'),
};

export type PlatformApi = typeof platformApi;