import fs from 'fs/promises';
import path from 'path';
import config from 'config';

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

export const updateLocalLibrary = async () => {
    const scanPaths = config.get('scan_paths');
    console.log('scanPaths:', scanPaths);
    const supportedFormats = config.get('supported_formats').map(ext => ext.toLowerCase());
    const libraryPath = "./data/playlists/library.json";

    // 验证配置项
    if (!Array.isArray(scanPaths)) {
        console.error('配置错误：scan_paths 应为数组');
        return;
    }
    if (!Array.isArray(supportedFormats)) {
        console.error('配置错误：supported_formats 应为数组');
        return;
    }

    try {
        // 加载现有的音乐库
        const existingLibrary = await loadExistingLibrary(libraryPath);
        const existingFilesMap = new Map();

        // 确保 existingLibrary.tracks 是一个数组
        const existingTracks = Array.isArray(existingLibrary?.tracks) ? existingLibrary.tracks : [];

        // 创建一个现有文件的映射，用于快速查找
        existingTracks.forEach(file => {
            // 优先选择 file_path，如果没有则使用 data_href
            const filePath = file.file_path || file.data_href;
            if (filePath) {
                const normalizedPath = path.resolve(filePath);
                existingFilesMap.set(normalizedPath, file);
            } else {
                console.warn(`文件缺少有效路径: ${JSON.stringify(file)}`);
            }
        });

        const newTracks = []; // 用于存储新添加的文件信息

        // 扫描目录并获取音频文件的函数
        const getTracksFromPaths = async (paths, formats) => {
            const tracks = [...existingTracks]; // 先加载已有的曲目

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
                                    if (!existingFilesMap.has(normalizedPath)) {
                                        // 仅当文件不存在于音乐库中时才添加新的文件数据
                                        const newFile = {
                                            file_path: normalizedPath,
                                            created_at: getCurrentTimestamp(),
                                        };
                                        tracks.push(newFile);
                                        newTracks.push(newFile); // 记录新增文件信息
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

        // 将更新后的音乐库写入JSON文件的函数
        const writeLocalLibrary = async (tracks) => {
            const library = {tracks};

            try {
                // 确保目录存在
                const libraryDir = path.dirname(libraryPath);
                if (!await fileExists(libraryDir)) {
                    await fs.mkdir(libraryDir, {recursive: true});
                }

                await fs.writeFile(libraryPath, JSON.stringify(library, null, 2), 'utf8');
                console.log("本地音乐库更新成功");

                // 打印新增曲目统计信息
                if (newTracks.length > 0) {
                    console.log(`新增曲目数量: ${newTracks.length}`);
                    newTracks.forEach(file => console.log(`新增曲目: ${file.file_path} 添加时间: ${file.added_at}`));
                } else {
                    console.log("没有新增的曲目。");
                }
            } catch (error) {
                console.error(`写入音乐库文件时出错: ${error.message}`);
            }
        };

        const tracks = await getTracksFromPaths(scanPaths, supportedFormats);
        await writeLocalLibrary(tracks);

    } catch (error) {
        console.error(`更新本地音乐库时出错: ${error.message}`);
        console.error(error);
    }
};

// 测试函数调用
// updateLocalLibrary();
