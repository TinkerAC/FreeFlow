import { MetadataEditorService } from '@main/core/audio/MetadataEditorService';
import { validateEditableTrackMetadata } from '@src/shared/metadata/metadataValidation';
import type { TrackMetadataValidationResult } from '@src/shared/metadata/metadataValidation';

export class AudioMetadataValidationService {
  public static async validateFile(filePath: string): Promise<TrackMetadataValidationResult> {
    const metadata = await MetadataEditorService.readMetadata(filePath);
    return validateEditableTrackMetadata(metadata);
  }
}
