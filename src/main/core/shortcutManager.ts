// file: src/main/shortcutManager.ts
import { BrowserWindow, globalShortcut } from 'electron';

interface Shortcut {
  key: string;
  action: string;
}

export function registerGlobalShortcuts(mainWindow: BrowserWindow): void {
  // 需要发送的快捷键
  const shortcuts: Shortcut[] = [
    {
      key: 'Control+Alt+Left',
      action: 'prev',
    },
    {
      key: 'Control+Alt+Right',
      action: 'next',
    },
    {
      key: 'Control+Alt+P',
      action: 'play-pause',
    },
    {
      key: 'Control+Alt+Up',
      action: 'volume-up',
    },
    {
      key: 'Control+Alt+Down',
      action: 'volume-down',
    },
    {
      key: 'Control+Alt+F12',
      action: 'toggle-dev-tools',
    },
  ];

  shortcuts.forEach(({ key, action }) => {
    const ret = globalShortcut.register(key, () => {
      console.log(`${key} 按下`);
      mainWindow.webContents.send('global-shortcutContext', action);
    });

    if (!ret) {
      console.log(`注册 ${key} 快捷键失败`);
    }
  });
}

export function unregisterGlobalShortcuts(): void {
  globalShortcut.unregisterAll();
  console.log('所有全局快捷键已注销');
}