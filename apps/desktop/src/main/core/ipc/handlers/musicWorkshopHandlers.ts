import { ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { AudioService } from '@main/core/audio/AudioService';
import { IpcContext } from './ipcContext';
import { WindowKey } from '@main/window/windowManager';

export function registerMusicWorkshopHandlers(ctx: IpcContext): void {
  ipcMain.handle(Channels.CreatorsWorkshop.Show, async () => {
    ctx.windowManager.show(WindowKey.CREATORS_WORKSHOP);
  });

  ipcMain.handle(Channels.CreatorsWorkshop.ReadMetadata, async (_event, filePath: string) => {
    try {
      const metadata = await AudioService.readMeta(filePath);
      return {
        filePath,
        title: metadata.tags.title,
        artist: metadata.tags.artist,
        album: metadata.tags.album,
        year: metadata.tags.year,
        genre: metadata.tags.genre,
      };
    } catch (error) {
      console.error(`Failed to read metadata for ${filePath}:`, error);
      return { filePath, error: error.message };
    }
  });
}
