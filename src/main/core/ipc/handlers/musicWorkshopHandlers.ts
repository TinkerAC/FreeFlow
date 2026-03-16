import { dialog, ipcMain } from 'electron';
import { AudioService } from '@main/core/audio/AudioService';
import { IpcContext } from './ipcContext';

export function registerMusicWorkshopHandlers(ctx: IpcContext): void {
  ipcMain.handle('MUSIC_WORKSHOP_SELECT_FILE', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'wav', 'ogg', 'm4a'] }],
    });
    return result.filePaths;
  });

  ipcMain.handle('MUSIC_WORKSHOP_READ_METADATA', async (_event, filePath: string) => {
    try {
      const metadata = await AudioService.readMeta(filePath);
      return {
        filePath,
        title: metadata.tags.title,
        artist: metadata.tags.artist,
        album: metadata.tags.album,
        year: metadata.tags.year,
        genre: metadata.tags.genre,
        // We can add more fields or cover art later
      };
    } catch (error) {
      console.error(`Failed to read metadata for ${filePath}:`, error);
      return { filePath, error: error.message };
    }
  });

  ipcMain.handle('MUSIC_WORKSHOP_WRITE_METADATA', async (_event, filePath: string, metadata: any) => {
    // TODO: Implement metadata writing
    console.warn('Writing metadata is not yet implemented');
    return { success: false, message: 'Not implemented' };
  });
}
