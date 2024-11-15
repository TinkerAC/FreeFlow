import sqlite3 from 'sqlite3';
import {promisify} from 'util';

// 单例数据库实例
let dbInstance = null;


async function initDataBase(dbPath) {
    return new Promise((resolve, reject) => {
        // 打开数据库连接
        const db = new sqlite3.Database(dbPath, async (err) => {
            if (err) {
                console.log('数据库文件路径:', dbPath);
                console.error('无法连接到数据库:', err.message);
                return reject(err);
            }
            console.log('已连接到数据库。');

            // 启用外键约束
            db.run('PRAGMA foreign_keys = ON;', async (err) => {
                if (err) {
                    console.error('无法启用外键约束:', err.message);
                    return reject(err);
                }

                // 将 db.run 进行 promisify 以便使用 async/await
                const run = promisify(db.run.bind(db));

                try {
                    // 创建 hifini_info 表
                    const createHifiniInfoTable = `
                        CREATE TABLE IF NOT EXISTS hifini_info (
                            data_href TEXT PRIMARY KEY,
                            title TEXT,
                            artist TEXT,
                            cover_src TEXT,
                            un_redirected_url TEXT,
                            cached_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    `;
                    await run(createHifiniInfoTable);
                    console.log("hifini_info 表创建成功或已存在。");

                    // 创建 playlists 表
                    const createPlaylistsTable = `
                        CREATE TABLE IF NOT EXISTS playlists (
                            playlist_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            playlist_cover TEXT,
                            title TEXT NOT NULL,
                            creator TEXT NOT NULL,
                            description TEXT,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `;
                    await run(createPlaylistsTable);
                    console.log("playlists 表创建成功或已存在。");

                    // 创建 library 表
                    const createLibraryTable = `
                        CREATE TABLE IF NOT EXISTS library (
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
                        )
                    `;
                    await run(createLibraryTable);
                    console.log("library 表创建成功或已存在。");

                    // 创建 playlist_detail 表
                    const createPlaylistDetailTable = `
                        CREATE TABLE IF NOT EXISTS playlist_detail (
                            playlist_id INTEGER,
                            track_id INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            PRIMARY KEY (playlist_id, track_id),
                            FOREIGN KEY (playlist_id) REFERENCES playlists(playlist_id) ON DELETE CASCADE ON UPDATE CASCADE,
                            FOREIGN KEY (track_id) REFERENCES library(track_id) ON DELETE CASCADE ON UPDATE CASCADE
                        )
                    `;
                    await run(createPlaylistDetailTable);
                    console.log("playlist_detail 表创建成功或已存在。");

                    // 为每个表创建触发器，自动更新 modified_at 字段
                    // hifini_info 表触发器
                    const createHifiniInfoTrigger = `
                        CREATE TRIGGER IF NOT EXISTS hifini_info_modified_at
                        AFTER UPDATE ON hifini_info
                        FOR EACH ROW
                        BEGIN
                            UPDATE hifini_info SET modified_at = CURRENT_TIMESTAMP WHERE data_href = OLD.data_href;
                        END;
                    `;
                    await run(createHifiniInfoTrigger);
                    console.log("hifini_info 表的 modified_at 触发器创建成功。");

                    // playlists 表触发器
                    const createPlaylistsTrigger = `
                        CREATE TRIGGER IF NOT EXISTS playlists_modified_at
                        AFTER UPDATE ON playlists
                        FOR EACH ROW
                        BEGIN
                            UPDATE playlists SET modified_at = CURRENT_TIMESTAMP WHERE playlist_id = OLD.playlist_id;
                        END;
                    `;
                    await run(createPlaylistsTrigger);
                    console.log("playlists 表的 modified_at 触发器创建成功。");

                    // library 表触发器
                    const createLibraryTrigger = `
                        CREATE TRIGGER IF NOT EXISTS library_modified_at
                        AFTER UPDATE ON library
                        FOR EACH ROW
                        BEGIN
                            UPDATE library SET modified_at = CURRENT_TIMESTAMP WHERE track_id = OLD.track_id;
                        END;
                    `;
                    await run(createLibraryTrigger);
                    console.log("library 表的 modified_at 触发器创建成功。");

                    // playlist_detail 表触发器
                    const createPlaylistDetailTrigger = `
                        CREATE TRIGGER IF NOT EXISTS playlist_detail_modified_at
                        AFTER UPDATE ON playlist_detail
                        FOR EACH ROW
                        BEGIN
                            UPDATE playlist_detail SET modified_at = CURRENT_TIMESTAMP WHERE playlist_id = OLD.playlist_id AND track_id = OLD.track_id;
                        END;
                    `;
                    await run(createPlaylistDetailTrigger);
                    console.log("playlist_detail 表的 modified_at 触发器创建成功。");

                    // 设置单例实例
                    dbInstance = db;

                    resolve(db);
                } catch (err) {
                    console.error('创建表或触发器时出错:', err.message);
                    reject(err);
                }
            });
        });
    });
}


/**
 * 获取数据库实例，如果未初始化则进行初始化
 * @param {string} dbPath - 数据库文件路径
 * @returns {Promise<sqlite3.Database>} - 返回数据库实例
 */
function getDatabase(dbPath) {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
        } else {
            initDataBase(dbPath)
                .then(db => resolve(db))
                .catch(err => reject(err));
        }
    });
}

/**
 * 执行数据库的 get 查询
 * @param {sqlite3.Database} db - 数据库实例
 * @param {string} sql - SQL 查询语句
 * @param {Array} [params=[]] - 查询参数
 * @returns {Promise<Object>} - 返回查询结果的第一行
 */
function dbGet(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('dbGet 错误:', err.message);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

/**
 * 执行数据库的 run 操作
 * @param {sqlite3.Database} db - 数据库实例
 * @param {string} sql - SQL 语句
 * @param {Array} [params=[]] - 参数
 * @returns {Promise<sqlite3.RunResult>} - 返回 run 操作的结果
 */
async function dbRun(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error('dbRun 错误:', err.message);
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

/**
 * 执行数据库的 all 查询
 * @param {sqlite3.Database} db - 数据库实例
 * @param {string} sql - SQL 查询语句
 * @param {Array} [params=[]] - 查询参数
 * @returns {Promise<Array>} - 返回所有查询结果
 */
function dbAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('dbAll 错误:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// 导出函数
export {initDataBase, getDatabase, dbGet, dbRun, dbAll};

// // 自动初始化数据库
// initDataBase('db.sqlite3')
//     .then(db => {
//         console.log('数据库初始化完成。');
//     })
//     .catch(err => {
//         console.error('数据库初始化失败:', err);
//     });
