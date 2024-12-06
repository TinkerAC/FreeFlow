/*
 Navicat Premium Dump SQL

 Source Server         : freeflow
 Source Server Type    : SQLite
 Source Server Version : 3045000 (3.45.0)
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3045000 (3.45.0)
 File Encoding         : 65001

 Date: 06/12/2024 16:15:15
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for hifini_thread_cache
-- ----------------------------
DROP TABLE IF EXISTS "hifini_thread_cache";
CREATE TABLE `hifini_thread_cache` (`data_href` TEXT PRIMARY KEY, `title` TEXT, `artist` TEXT, `cover_src` TEXT, `un_redirected_url` TEXT, `cached_at` DATETIME, `modified_at` DATETIME);

-- ----------------------------
-- Table structure for playlist_detail
-- ----------------------------
DROP TABLE IF EXISTS "playlist_detail";
CREATE TABLE playlist_detail (
                            playlist_id INTEGER,
                            track_id INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (playlist_id, track_id),
                            FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE ON UPDATE CASCADE,
                            FOREIGN KEY (track_id) REFERENCES "track"(track_id) ON DELETE CASCADE ON UPDATE CASCADE
                        );

-- ----------------------------
-- Table structure for playlists
-- ----------------------------
DROP TABLE IF EXISTS "playlists";
CREATE TABLE "playlists" (
  "playlist_id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "playlist_cover" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "creator" TEXT NOT NULL,
  "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "modified_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- Table structure for sqlite_sequence
-- ----------------------------
DROP TABLE IF EXISTS "sqlite_sequence";
CREATE TABLE sqlite_sequence(name,seq);

-- ----------------------------
-- Table structure for track
-- ----------------------------
DROP TABLE IF EXISTS "track";
CREATE TABLE "track" (
                            track_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            data_href TEXT,
                            file_path TEXT,
                            title TEXT,            
                            artist TEXT,
                            album TEXT,
                            duration INTEGER,
                            cover_src TEXT,
                            lyrics TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        );

-- ----------------------------
-- Triggers structure for table playlist_detail
-- ----------------------------
CREATE TRIGGER "main"."playlist_detail_modified_at"
AFTER UPDATE
ON "playlist_detail"
FOR EACH ROW
BEGIN
                            UPDATE playlist_detail SET modified_at = CURRENT_TIMESTAMP WHERE playlist_id = OLD.playlist_id AND track_id = OLD.track_id;
                        END;

-- ----------------------------
-- Auto increment value for playlists
-- ----------------------------
UPDATE "main"."sqlite_sequence" SET seq = 3 WHERE name = 'playlists';

-- ----------------------------
-- Triggers structure for table playlists
-- ----------------------------
CREATE TRIGGER "main"."playlists_modified_at"
AFTER UPDATE
ON "playlists"
FOR EACH ROW
BEGIN
                            UPDATE playlists SET modified_at = CURRENT_TIMESTAMP WHERE playlist_id = OLD.playlist_id;
                        END;

-- ----------------------------
-- Auto increment value for track
-- ----------------------------
UPDATE "main"."sqlite_sequence" SET seq = 292 WHERE name = 'track';

-- ----------------------------
-- Triggers structure for table track
-- ----------------------------
CREATE TRIGGER "main"."library_modified_at"
AFTER UPDATE
ON "track"
FOR EACH ROW
BEGIN
                            UPDATE "track" SET modified_at = CURRENT_TIMESTAMP WHERE track_id = OLD.track_id;
                        END;

PRAGMA foreign_keys = true;
