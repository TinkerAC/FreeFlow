import fs from 'fs';
import path from 'path';
import config from 'config';

// 获取当前时间戳的函数
const getCurrentTimestamp = () => {
    return new Date().toISOString();
};

// 从JSON文件加载现有音乐库的函数
const loadExistingLibrary = (libraryPath) => {
    if (fs.existsSync(libraryPath)) {
        try {
            const libraryData = fs.readFileSync(libraryPath);
            return JSON.parse(libraryData);
        } catch (error) {
            console.error(`读取音乐库文件时出错: ${error}`);
            return null;
        }
    }
    return { audio_files: [] };
};

export const updateLocalLibrary = () => {
    const scanPaths = config.get('scan_paths');
    const supportedFormats = config.get('supported_formats');
    const libraryPath = "./data/library.json";

    // 加载现有的音乐库
    const existingLibrary = loadExistingLibrary(libraryPath);
    const existingFilesMap = new Map();

    // 创建一个现有文件的映射，用于快速查找
    if (existingLibrary && existingLibrary.audio_files) {
        existingLibrary.audio_files.forEach(file => {
            existingFilesMap.set(file.file_path, file);
        });
    }

    // 扫描目录并获取音频文件的函数
    const getAudioFilesFromPaths = (paths, supportedFormats) => {
        let audioFiles = [];
        paths.forEach(directoryPath => {
            if (fs.existsSync(directoryPath)) {
                const files = fs.readdirSync(directoryPath);

                files.forEach(file => {
                    const ext = path.extname(file).substring(1); // 获取文件扩展名并移除前导的点
                    if (supportedFormats.includes(ext)) {
                        const filePath = path.resolve(directoryPath, file);
                        if (existingFilesMap.has(filePath)) {
                            // 如果文件已存在于音乐库中，重用其数据
                            audioFiles.push(existingFilesMap.get(filePath));
                        } else {
                            // 新文件，添加时附加当前时间戳
                            audioFiles.push({
                                file_path: filePath,
                                added_at: getCurrentTimestamp(),
                            });
                        }
                    }
                });
            } else {
                console.warn(`目录不存在: ${directoryPath}`);
            }
        });

        return audioFiles;
    };

    // 将更新后的音乐库写入JSON文件的函数
    const writeLocalLibrary = (audioFiles) => {
        const library = { audio_files: audioFiles };

        try {
            fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
            console.log("本地音乐库更新成功");
        } catch (error) {
            console.error(`写入音乐库文件时出错: ${error}`);
        }
    };

    const audioFiles = getAudioFilesFromPaths(scanPaths, supportedFormats);
    writeLocalLibrary(audioFiles);
};
