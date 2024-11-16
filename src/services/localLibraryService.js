import fs from 'fs/promises';
import path from 'path';
import config from 'config';
import {dbGet, dbRun, getDatabase} from "../utils/dbUtils.js";
import {fileURLToPath} from 'url';


const __dirname = fileURLToPath(import.meta.url);
const __filename = path.join(__dirname, 'localLibraryService.js');

// 帮助函数：检查文件或目录是否存在
const fileExists = async (filePath) => {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
};

// 获取当前时间戳的函数
const getCurrentTimestamp = () => new Date().toISOString();

// 从JSON文件加载现有音乐库的函数
const loadExistingLibrary = async (libraryPath) => {
    if (await fileExists(libraryPath)) {
        try {
            const libraryData = await fs.readFile(libraryPath, 'utf8');
            return JSON.parse(libraryData);
        } catch (error) {
            console.error(`读取音乐库文件时出错: ${error.message}`);
            return null;
        }
    }
    return {tracks: []};
};


// 更新本地音乐库的函数
export async function updateLocalLibrary(db) {
    const scanPaths = config.get('scan_paths');
    const supportedFormats = config.get('supported_formats').map(ext => ext.toLowerCase());

    console.log('scanPaths:', scanPaths);
    console.log('supportedFormats:', supportedFormats);

    // Validate configuration
    if (!Array.isArray(scanPaths)) {
        console.error('配置错误：scan_paths 应为数组');
        return;
    }
    if (!Array.isArray(supportedFormats)) {
        console.error('配置错误：supported_formats 应为数组');
        return;
    }

    try {
        // Start transaction
        await dbRun(db, 'BEGIN TRANSACTION');

        // Function to scan directory and get valid audio files
        const getTracksFromPaths = async (paths, formats) => {
            const tracks = [];
            for (const directoryPath of paths) {
                if (await fileExists(directoryPath)) {
                    try {
                        const files = await fs.readdir(directoryPath, {withFileTypes: true});
                        for (const dirent of files) {
                            if (dirent.isFile()) {
                                const ext = path.extname(dirent.name).substring(1).toLowerCase();
                                if (formats.includes(ext)) {
                                    const filePath = path.resolve(directoryPath, dirent.name);
                                    const normalizedPath = path.resolve(filePath);

                                    // Check if the file already exists in the library
                                    const sql = 'SELECT * FROM library WHERE file_path = ?';
                                    const result = await dbGet(db, sql, [normalizedPath]);

                                    if (!result) {
                                        console.log(`发现新文件: ${normalizedPath}`);
                                        tracks.push({file_path: normalizedPath, created_at: getCurrentTimestamp()});
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`读取目录 ${directoryPath} 时出错: ${error.message}`);
                    }
                } else {
                    console.warn(`目录不存在: ${directoryPath}`);
                }
            }
            return tracks;
        };

        // Insert new tracks into the database
        const insertTracksIntoLibrary = async (tracks) => {
            const insertSql = 'INSERT INTO library (file_path, created_at) VALUES (?, ?)';
            for (const track of tracks) {
                await dbRun(db, insertSql, [track.file_path, track.created_at]);
            }
        };

        // Get valid tracks from scanPaths
        const tracks = await getTracksFromPaths(scanPaths, supportedFormats);

        // If we found new tracks, insert them into the database
        if (tracks.length > 0) {
            await insertTracksIntoLibrary(tracks);
        } else {
            console.log('没有找到新的音频文件');
        }

        // Commit transaction
        await dbRun(db, 'COMMIT');
        console.log('音乐库更新完成');

    } catch (error) {
        // Rollback transaction in case of error
        await dbRun(db, 'ROLLBACK');
        console.error(`更新本地音乐库时出错: ${error.message}`);
        console.error(error);
    }
}

// 测试函数调用
// updateLocalLibrary();


// updateLocalLibrary(await
//     getDatabase(path.join(__dirname, '..', '..', 'data', 'database.sqlite'))
// ).then();