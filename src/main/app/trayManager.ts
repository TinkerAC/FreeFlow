// trayManager.js
import { app, Menu, Tray } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
fileURLToPath(import.meta.url);

let tray: Tray | null = null;

function createTray(mainWindow: Electron.BrowserWindow) {
  const trayIconPath = path.join(__dirname, '..', '..', 'assets', 'appIcon.ico');
  tray = new Tray(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        mainWindow.show();
      },
    },
    {
      label: '退出',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('FreeFlow');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });

  console.log('系统托盘已创建');
  return tray;
}

export { createTray, tray };
