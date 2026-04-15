import { Menu } from 'electron';
import { container } from '@main/di/di-container';
import { DISymbol } from '@main/di/symbol';
import { OS } from '@src/shared/OS';
import { WindowKey, WindowManager } from '@main/window/windowManager';
import { Channels } from '@src/shared/ipc/channels';

const windowManager: WindowManager = container.get(DISymbol.WindowManager);
const isMac: boolean = container.get<OS>(DISymbol.RunningOS) === OS.MACOS;

const menu_template = [
  // Application Menu (macOS specific)
  ...(isMac ? [{
    label: 'FreeFlow',
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
      {
        label: 'SaveState',
        click: () => {
          windowManager.get(WindowKey.MAIN)?.webContents.send(Channels.Player.RequestDump);
        },
        accelerator: 'Cmd+S',
      },
    ],
  }] : []),
  // File Menu
  {
    label: 'File',
    submenu: [
      isMac ? { role: 'close' } : { role: 'quit' },
    ],
  },
  // Edit Menu
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      ...(isMac ? [
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [
            { role: 'startSpeaking' },
            { role: 'stopSpeaking' },
          ],
        },
      ] : [
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' },
      ]),
    ],
  },
  // View Menu
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  },
  // Window Menu
  {
    label: 'Window',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      ...(isMac ? [
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' },
      ] : [
        { role: 'close' },
      ]),
    ],
  },
  // Tools Menu
  {
    label: 'Tools',
    submenu: [
      {
        label: 'Creators Workshop',
        click: () => {
          windowManager.show(WindowKey.CREATORS_WORKSHOP);
        },
      },
    ],
  },
  // Help Menu
  {
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          const { shell } = require('electron');
          await shell.openExternal('https://electronjs.org');
        },
      },
    ],
  },


];

const menu: Menu = Menu.buildFromTemplate(menu_template as any);

export function setAppMenu() {
  Menu.setApplicationMenu(menu);
}
