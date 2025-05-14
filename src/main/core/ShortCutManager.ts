import { BrowserWindow, globalShortcut } from 'electron';

interface Shortcut {
  key: string;
  action: string;
}

/**
 * ShortCutManager
 * ---------------
 * 对全局快捷键进行面向对象封装，提供 `register()` / `unregister()` 方法。
 * 仍然保留旧版的 `registerGlobalShortcuts` / `unregisterGlobalShortcuts`
 * 函数式接口，方便渐进迁移。
 */
export default class ShortCutManager {
  private readonly shortcuts: Shortcut[] = [
    { key: 'Control+Alt+Left', action: 'prev' },
    { key: 'Control+Alt+Right', action: 'next' },
    { key: 'Control+Alt+P', action: 'play-pause' },
    { key: 'Control+Alt+Up', action: 'volume-up' },
    { key: 'Control+Alt+Down', action: 'volume-down' },
    { key: 'Control+Alt+F12', action: 'toggle-dev-tools' },
  ];

  constructor(private readonly mainWindow: BrowserWindow) {
  }

  /** 注册全部快捷键 */
  public register(): void {
    this.shortcuts.forEach(({ key, action }) => {
      const ok = globalShortcut.register(key, () => {
        console.log(`${key} 按下`);
        this.mainWindow.webContents.send('global-shortcutContext', action);
      });

      if (!ok) {
        console.log(`注册 ${key} 快捷键失败`);
      }
    });
  }

  /** 注销全部快捷键 */
  public unregister(): void {
    globalShortcut.unregisterAll();
    console.log('所有全局快捷键已注销');
  }
}

