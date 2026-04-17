import type { EditableTrackMetadata } from './metadataEditor';

export type RequiredTrackMetadataField = 'title' | 'artist' | 'genre' | 'lyrics';

export type TrackMetadataValidationIssue = {
  field: RequiredTrackMetadataField;
  label: string;
  message: string;
};

export type TrackMetadataValidationResult = {
  ok: boolean;
  filePath: string;
  metadata: EditableTrackMetadata;
  missingFields: RequiredTrackMetadataField[];
  issues: TrackMetadataValidationIssue[];
};

export const REQUIRED_TRACK_METADATA_FIELDS: Array<{
  field: RequiredTrackMetadataField;
  label: string;
}> = [
  { field: 'title', label: '标题' },
  { field: 'artist', label: '艺术家' },
  { field: 'genre', label: '流派' },
  { field: 'lyrics', label: '歌词' },
];

export function validateEditableTrackMetadata(
  metadata: EditableTrackMetadata,
): TrackMetadataValidationResult {
  const issues = REQUIRED_TRACK_METADATA_FIELDS
    .filter(({ field }) => !String(metadata[field] ?? '').trim())
    .map(({ field, label }) => ({
      field,
      label,
      message: `${label}为必填元数据`,
    }));

  return {
    ok: issues.length === 0,
    filePath: metadata.filePath,
    metadata,
    missingFields: issues.map((issue) => issue.field),
    issues,
  };
}
