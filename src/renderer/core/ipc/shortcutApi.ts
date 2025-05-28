import { ipcRenderer } from 'electron';

export const shortcutApi = {
  onShortcut: (callback: (message: string) => void) => {
    ipcRenderer.on('global-shortcut', (event, message) => {
      callback(message);
    });
  },
  removeShortcutListener: () => {
    ipcRenderer.removeAllListeners('global-shortcut');
    console.log('全局快捷键事件监听已移除');
  },
};


export type ShortcutApi = typeof shortcutApi;