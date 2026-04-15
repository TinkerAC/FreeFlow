import { BrowserWindow, ipcMain, screen } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { WindowKey } from '@main/window/windowManager';
import { IpcContext } from './ipcContext';

export function registerWindowHandlers({ windowManager, configService }: IpcContext): void {
  const miniBoundSet = new WeakSet<BrowserWindow>();

  const applyMiniPlayerBounds = (mini: BrowserWindow) => {
    try {
      const saved = configService.get('ui.miniPlayer');
      if (!saved) return;
      const { x, y, width, height } = saved as { x?: number; y?: number; width?: number; height?: number };
      const next: Electron.Rectangle = {
        x: typeof x === 'number' ? x : mini.getBounds().x,
        y: typeof y === 'number' ? y : mini.getBounds().y,
        width: typeof width === 'number' ? Math.max(mini.getMinimumSize()[0], width) : mini.getBounds().width,
        height: typeof height === 'number' ? Math.max(mini.getMinimumSize()[1], height) : mini.getBounds().height,
      };

      const display = screen.getDisplayMatching(next);
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
      next.x = Math.max(dx, Math.min(next.x, dx + dw - 50));
      next.y = Math.max(dy, Math.min(next.y, dy + dh - 50));
      next.width = Math.min(next.width, dw);
      next.height = Math.min(next.height, dh);

      mini.setBounds(next, false);
    } catch (error) {
      console.warn('应用 MiniPlayer 窗口位置/大小失败:', error);
    }
  };

  const attachMiniPlayerPersistence = (mini: BrowserWindow) => {
    if (miniBoundSet.has(mini)) return;
    miniBoundSet.add(mini);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const bounds = mini.getBounds();
          configService.setByPath('ui.miniPlayer', {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        } catch (error) {
          console.warn('保存 MiniPlayer 窗口位置/大小失败:', error);
        }
      }, 150);
    };

    mini.on('move', save);
    mini.on('resize', save);
    mini.on('close', save);
  };

  ipcMain.handle(Channels.MiniPlayer.Toggle, async () => {
    if (windowManager.isVisible(WindowKey.MINI)) {
      windowManager.activate(WindowKey.MAIN);
    } else {
      const mini = windowManager.ensure(WindowKey.MINI);
      applyMiniPlayerBounds(mini);
      attachMiniPlayerPersistence(mini);
      windowManager.showExclusive(WindowKey.MINI, true);
      const main = windowManager.get(WindowKey.MAIN);
      const ask = () => main?.webContents.send(Channels.Player.RequestState);
      const wc = mini.webContents;
      if (wc.isLoadingMainFrame()) wc.once('did-finish-load', ask); else setTimeout(ask, 0);
    }
  });

  ipcMain.handle(Channels.MiniPlayer.Show, async () => {
    const mini = windowManager.ensure(WindowKey.MINI);
    applyMiniPlayerBounds(mini);
    attachMiniPlayerPersistence(mini);
    windowManager.showExclusive(WindowKey.MINI, true);
    const main = windowManager.get(WindowKey.MAIN);
    if (main) {
      const ask = () => main.webContents.send(Channels.Player.RequestState);
      const wc = mini.webContents;
      if (wc.isLoadingMainFrame()) wc.once('did-finish-load', ask); else setTimeout(ask, 0);
    }
  });

  ipcMain.handle(Channels.MiniPlayer.Hide, async () => {
    windowManager.hide(WindowKey.MINI);
    windowManager.activate(WindowKey.MAIN);
  });

  ipcMain.handle(Channels.MiniPlayer.SetExpanded, async (_evt, payload: { expanded: boolean }) => {
    if (!payload || typeof payload.expanded !== 'boolean') {
      console.warn('[mini-player:set-expanded] invalid payload');
      return;
    }
    const mini = windowManager.ensure(WindowKey.MINI);
    const [w] = mini.getSize();
    const collapsedH = 100;
    const expandedH = collapsedH + 120;
    mini.setSize(w, payload.expanded ? expandedH : collapsedH, true);
  });
}
