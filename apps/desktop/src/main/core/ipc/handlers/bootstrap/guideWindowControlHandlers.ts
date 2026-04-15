import { ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import logger from '@src/utils/logger';
import { WindowControlAction, WindowManager } from '@main/window/windowManager';

const windowControlActions: WindowControlAction[] = ['minimize', 'maximize', 'close'];
function isWindowControlAction(action: string): action is WindowControlAction {
  return windowControlActions.includes(action as WindowControlAction);
}

export function registerBootstrapWindowControls(windowManager: WindowManager): void {
  ipcMain.removeAllListeners(Channels.Window.Controls);
  ipcMain.on(Channels.Window.Controls, (event, action: string) => {
    if (!isWindowControlAction(action)) {
      logger.warn(`Unknown window action: ${action}`);
      return;
    }

    const applied = windowManager.controlFromWebContents(event.sender, action);
    if (!applied) {
      logger.warn(`Window action ignored (window missing): ${action}`);
    }
  });
}
