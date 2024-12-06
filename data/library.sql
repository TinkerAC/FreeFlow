/*
 Navicat Premium Dump SQL

 Source Server         : freeflow_dev
 Source Server Type    : SQLite
 Source Server Version : 3045000 (3.45.0)
 Source Schema         : main

 Target Server Type    : SQLite
 Target Server Version : 3045000 (3.45.0)
 File Encoding         : 65001

 Date: 04/12/2024 00:12:50
*/

PRAGMA foreign_keys = false;

-- ----------------------------
-- Table structure for library
-- ----------------------------
DROP TABLE IF EXISTS "library";
CREATE TABLE library (
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
-- Auto increment value for library
-- ----------------------------
UPDATE "main"."sqlite_sequence" SET seq = 292 WHERE name = 'library';

-- ----------------------------
-- Triggers structure for table library
-- ----------------------------
CREATE TRIGGER "main"."library_modified_at"
AFTER UPDATE
ON "library"
FOR EACH ROW
BEGIN
                            UPDATE library SET modified_at = CURRENT_TIMESTAMP WHERE track_id = OLD.track_id;
                        END;

PRAGMA foreign_keys = true;
