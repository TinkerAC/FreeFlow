import { ipcMain } from 'electron';
import { Channels } from '@src/shared/ipc/channels';
import { IpcContext } from './ipcContext';
import { WindowKey } from '@main/window/windowManager';
import { MetadataEditorService } from '@main/core/audio/MetadataEditorService';
import { AudioMetadataValidationService } from '@main/core/audio/AudioMetadataValidationService';
import type { MetadataWriteRequest } from '@src/shared/metadata/metadataEditor';

export function registerMusicWorkshopHandlers(ctx: IpcContext): void {
  ipcMain.handle(Channels.CreatorsWorkshop.Show, async () => {
    ctx.windowManager.show(WindowKey.CREATORS_WORKSHOP);
  });

  ipcMain.handle(Channels.CreatorsWorkshop.ReadMetadata, async (_event, filePath: string) => {
    try {
      return await MetadataEditorService.readMetadata(filePath);
    } catch (error) {
      console.error(`Failed to read metadata for ${filePath}:`, error);
      throw error;
    }
  });

  ipcMain.handle(Channels.CreatorsWorkshop.WriteMetadata, async (_event, payload: MetadataWriteRequest) => {
    return await MetadataEditorService.writeMetadata(payload);
  });

  ipcMain.handle(Channels.CreatorsWorkshop.ValidateMetadata, async (_event, filePath: string) => {
    return await AudioMetadataValidationService.validateFile(filePath);
  });
}
