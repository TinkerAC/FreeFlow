import { ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { Settings } from '@src/shared/settings/schema';
import { IpcContext } from './ipcContext';
import { AppIcon } from '@src/shared/hifiniCookies';

export function registerConfigHandlers({ configService }: IpcContext): void {
  ipcMain.handle(Channels.Config.GetAll, async () => {
    return await configService.getAll();
  });

  ipcMain.handle(Channels.Config.Get, async (_evt, key: string) => {
    return await configService.get(key);
  });

  ipcMain.handle(Channels.Config.Set, async (_evt, payload: { key: string; value: any }) => {
    if (!payload || typeof payload.key !== 'string') {
      console.warn('[config:set] invalid payload');
      return;
    }
    await configService.set(payload.key, payload.value);
  });

  ipcMain.handle(Channels.Config.SetByPath, async (_evt, payload: { path: string; value: any }) => {
    if (!payload || typeof payload.path !== 'string') {
      console.warn('[config:setByPath] invalid payload');
      return;
    }
    await configService.setByPath(payload.path, payload.value);
  });

  ipcMain.handle(Channels.Config.Patch, async (_evt, partial: Partial<Settings>) => {
    await configService.patch(partial);
  });

  let lastAppliedIcon: AppIcon | null = null;
  try {
    // lastAppliedIcon = preferenceService.getCurrentIcon();
  } catch {
    // ignore
  }

  configService.onChanged((s) => {
    const icon = (s as any)?.app?.icon as AppIcon | undefined;
    if (!icon) return;
    if (lastAppliedIcon === icon) return;
    lastAppliedIcon = icon;
  });
}

