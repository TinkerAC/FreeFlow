import sqlite3 from 'sqlite3';
import {promisify} from 'util';

// 单例数据库实例
let dbInstance = null;

/**
 * 初始化数据库并创建必要的表
 * @param {string} dbPath - 数据库文件路径
 * @returns {Promise<sqlite3.Database>} - 返回数据库实例
 */
function initDataBase(dbPath) {
    return new Promise((resolve, reject) => {
        // 打开数据库连接
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('无法连接到数据库:', err.message);
                return reject(err);
            }
            console.log('已连接到数据库。');

            // 使用 serialize 确保表按顺序创建
            db.serialize(() => {
                // 将 db.run 进行 promisify 以便使用 Promise
                const run = promisify(db.run.bind(db));

                // 创建 hifini_info 表
                const createHifiniInfoTable = `
                    CREATE TABLE IF NOT EXISTS hifini_info (
                        data_href TEXT PRIMARY KEY,
                        title TEXT,
                        artist TEXT,
                        cover_src TEXT,
                        un_redirected_url TEXT,
                        cached_at TIMESTAMP
                    )
                `;

                // 创建 playlists 表
                const createPlaylistsTable = `
                    CREATE TABLE IF NOT EXISTS playlists (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        playlistCover TEXT,
                        title TEXT NOT NULL,
                        creater TEXT NOT NULL,
                        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `;

                // 创建 playlist_detail 表
                const createPlaylistDetailTable = `
                    CREATE TABLE IF NOT EXISTS playlist_detail (
                        playlist_id INTEGER,
                        track_id INTEGER,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (playlist_id) REFERENCES playlists(id)
                    )
                `;

                // 依次执行表创建语句
                run(createHifiniInfoTable)
                    .then(() => {
                        console.log("hifini_info 表创建成功或已存在。");
                        return run(createPlaylistsTable);
                    })
                    .then(() => {
                        console.log("playlists 表创建成功或已存在。");
                        return run(createPlaylistDetailTable);
                    })
                    .then(() => {
                        console.log("playlist_detail 表创建成功或已存在。");
                        dbInstance = db; // 设置单例实例
                        resolve(db);
                    })
                    .catch((err) => {
                        console.error('创建表时出错:', err.message);
                        reject(err);
                    });
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
function dbRun(db, sql, params = []) {
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
