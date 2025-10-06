-- Migration: Add position fields to playlist and playlist_detail tables
-- Date: 2025-10-06
-- Description: 
--   1. Add position field to playlists table (tracks playlist position in frontend)
--   2. Add position field to playlist_detail table (tracks track position within playlist)
--   3. Initialize position values based on created_at (descending order)

-- Add position column to playlists table
ALTER TABLE playlists ADD COLUMN position INTEGER DEFAULT 0;

-- Initialize position values for existing playlists (ordered by created_at DESC)
-- Using rowid as a fallback ordering mechanism
UPDATE playlists 
SET position = (
  SELECT COUNT(*) 
  FROM playlists p2 
  WHERE p2.created_at > playlists.created_at 
     OR (p2.created_at = playlists.created_at AND p2.playlist_id < playlists.playlist_id)
);

-- Add position column to playlist_detail table
ALTER TABLE playlist_detail ADD COLUMN position INTEGER DEFAULT 0;

-- Initialize position values for existing playlist_detail records (ordered by created_at DESC within each playlist)
UPDATE playlist_detail
SET position = (
  SELECT COUNT(*)
  FROM playlist_detail pd2
  WHERE pd2.playlist_id = playlist_detail.playlist_id
    AND (pd2.created_at > playlist_detail.created_at 
         OR (pd2.created_at = playlist_detail.created_at AND pd2.track_id < playlist_detail.track_id))
);
