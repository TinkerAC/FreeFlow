import { ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { IpcContext } from './ipcContext';

export function registerMiscHandlers({ dataPath }: IpcContext): void {
  ipcMain.handle(Channels.System.GetUserDataPath, async () => dataPath.dbPath);

  ipcMain.on(Channels.System.RevealDB, async () => {
    const { shell } = require('electron');
    shell.showItemInFolder(dataPath.dbPath);
  });
}

