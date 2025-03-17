import { ipcRenderer } from 'electron';

export const windowControlApi = {
  minimize: () => ipcRenderer.send('window-controls', 'minimize'),
  maximize: () => ipcRenderer.send('window-controls', 'maximize'),
  close: () => ipcRenderer.send('window-controls', 'close'),
};

export type WindowControlApi = typeof windowControlApi;