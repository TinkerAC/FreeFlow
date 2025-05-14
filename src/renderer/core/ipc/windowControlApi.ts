import { ipcRenderer } from 'electron';

export const windowControlApi = {
  minimize: () => ipcRenderer.send('window-controls', 'minimize'),
  maximize: () => ipcRenderer.send('window-controls', 'maximize'),
  close: () => ipcRenderer.send('window-controls', 'close'),


  openPreferenceWindow: () => ipcRenderer.send('window-controls', 'open-preference-window'),
};

export type WindowControlApi = typeof windowControlApi;