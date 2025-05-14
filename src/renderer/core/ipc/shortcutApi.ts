import { ipcRenderer } from 'electron';

export const shortcutApi = {
  onShortcut: (callback: (message: string) => void) => {
    ipcRenderer.on('global-shortcutContext', (event, message) => {
      callback(message);
    });
  },
  removeShortcutListener: () => {
    ipcRenderer.removeAllListeners('global-shortcutContext');
    console.log('全局快捷键事件监听已移除');
  },
};


export type ShortcutApi = typeof shortcutApi;