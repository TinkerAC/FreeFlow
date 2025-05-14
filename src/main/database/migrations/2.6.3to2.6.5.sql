/* ========= dev → prd 结构迁移 ========= */
BEGIN TRANSACTION;
PRAGMA foreign_keys = OFF;

/* 1. playlists 表：增加 played_count */
ALTER TABLE playlists
    ADD COLUMN played_count INTEGER DEFAULT 0;

/* 2. track 表：增加 played_count、relative_local_path */
ALTER TABLE track
    ADD COLUMN played_count INTEGER DEFAULT 0;

ALTER TABLE track
    ADD COLUMN relative_local_path TEXT;

/* 3. 若不存在则创建 track_backup */
CREATE TABLE IF NOT EXISTS track_backup (
                                            id                INTEGER PRIMARY KEY,
                                            platform          TEXT NOT NULL UNIQUE,
                                            platform_unique_id TEXT UNIQUE,
                                            title             TEXT,
                                            artist            TEXT,
                                            album             TEXT,
                                            duration          INTEGER,
                                            cover_src         TEXT,
                                            lyrics            TEXT,
                                            created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                                            modified_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* 4. 修复触发器 library_modified_at（原先引用 track_id 列名错误） */
DROP TRIGGER IF EXISTS library_modified_at;
CREATE TRIGGER library_modified_at
    AFTER UPDATE ON track
    FOR EACH ROW
BEGIN
    UPDATE track
    SET modified_at = CURRENT_TIMESTAMP
    WHERE id = OLD.id;
END;

/* 开启外键并提交 */
PRAGMA foreign_keys = ON;
COMMIT;