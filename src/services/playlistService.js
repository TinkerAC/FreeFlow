import fs from 'fs';
import * as mm from 'music-metadata';
import path from 'path';
import { getSearchResults } from "./hifiniMusicService.js";

// 获取歌单列表
function getPlaylists(playlistsDir) {
    try {
        // 检查目录是否存在，如果不存在则创建
        if (!fs.existsSync(playlistsDir)) {
            fs.mkdirSync(playlistsDir, { recursive: true }); // 递归创建目录
            console.log('Playlists directory created.');
        }

        // 读取目录中的歌单文件
        const playlists = fs.readdirSync(playlistsDir);

        // 遍历每个歌单文件并解析其内容
        return playlists.map(playlist => {
            try {
                const filePath = path.join(playlistsDir, playlist);
                const data = fs.readFileSync(filePath, 'utf-8');
                return JSON.parse(data);
            } catch (err) {
                console.error(`Error reading or parsing playlist file: ${playlist}`, err);
                return null; // 处理读取或解析失败的情况
            }
        }).filter(playlist => playlist !== null); // 过滤掉无效的歌单
    } catch (err) {
        console.error('Error reading playlists directory:', err);
        return []; // 处理读取目录失败的情况，返回空数组
    }
}

// 生成新歌单的编号
function generateNewPlaylistNumber(playlistsDir) {
    try {
        const nameList = fs.readdirSync(playlistsDir);
        let maxNum = 0;

        nameList.forEach(name => {
            // 假设歌单文件名格式为 "#1.json", "#2.json" 等
            const match = name.match(/^#(\d+)\.json$/);
            if (match) {
                const num = parseInt(match[1], 10); // 提取编号并转换为整数
                if (num > maxNum) {
                    maxNum = num; // 更新最大的编号
                }
            }
        });

        // 新编号应该是当前最大编号 +1
        return maxNum + 1;
    } catch (err) {
        console.error('Error generating new playlist number:', err);
        return null; // 处理失败的情况，返回null表示生成失败
    }
}

// 获取音乐文件的元数据
async function extractMusicMeta(file_path) {
    try {
        return await mm.parseFile(file_path);
    } catch (error) {
        console.error('Error reading metadata:', error);
        throw error;
    }
}

function parseTrackInfo(metadata) {
    // 提取封面图片并转为Base64
    let coverBase64 = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0]; // 通常封面是第一个图片
        const buffer = Buffer.from(picture.data);

        coverBase64 = `data:${picture.format};base64,${buffer.toString('base64')}`
    }
    // 构建目标JSON对象
    return {
        cover_src: coverBase64,
        title: metadata.common.title || 'Unknown Title',
        artist: metadata.common.artist || 'Unknown Artist',
        album: metadata.common.album || 'Unknown Album',
        duration: metadata.format.duration || 0
    };
}

function addTrackToLibrary(track, libraryPath) {
    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf-8'));
    library.tracks.push(track);

    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
    console.log(`Track added to library: ${track.title}`);
}

function creatNewEmptyPlaylist(playlistsDir) {
    // 生成新歌单编号
    const newNumber = generateNewPlaylistNumber(playlistsDir);

    // 创建歌单模板
    const playlistTemplate = {
        imgSrc: 'https://placehold.co/50x50',
        title: `未命名歌单 #${newNumber}`,
        creater: '未知',
        createdAt: new Date().toISOString(),
        type: '歌单',
        songs: [],
    };

    // 确保目录存在
    if (!fs.existsSync(playlistsDir)) {
        fs.mkdirSync(playlistsDir, { recursive: true });
    }

    // 将歌单保存为 JSON 文件
    fs.writeFileSync(
        path.join(playlistsDir, `#${newNumber}.json`),
        JSON.stringify(playlistTemplate, null, 2),
        'utf-8'
    );
}

async function importPlaylistFromList(playlist, playlistsDir) {
    // 生成新歌单编号
    const newNumber = generateNewPlaylistNumber(playlistsDir);

    // 创建歌单模板
    const playlistTemplate = {
        imgSrc: 'https://placehold.co/50x50',
        title: `未命名歌单 #${newNumber}`,
        creater: "杨姝",
        createdAt: new Date().toISOString(),
        type: '歌单',
        tracks: [],
    };

    // 从列表中提取歌曲信息
    const unbind_tracks = playlist.split('\n').map(line => {
        const [title, artist] = line.split('-').map(s => s.trim());
        return { title, artist };
    });

    const length = unbind_tracks.length;

    // 从 hifini 网站获取歌曲信息
    for (const [index, track] of unbind_tracks.entries()) {
        try {
            const searchResults = await getSearchResults(`${track.title} ${track.artist}`);
            console.log(`正在处理第${index + 1}/${length}首歌曲: ${track.title} - ${track.artist}`);

            if (searchResults.length > 0) {
                const firstResult = searchResults[0];
                playlistTemplate.tracks.push({
                    data_href: firstResult.data_href,
                    file_path: null,
                    added_at: new Date().toISOString(),
                });
                console.log(`成功导入${track.title} - ${track.artist}`);
            } else {
                console.log(`未找到${track.title} - ${track.artist}`);
            }
        } catch (error) {
            console.error(`Error importing track: ${track.title} - ${track.artist}`, error);
            console.log(`导入${track.title} - ${track.artist}失败`);
        }
    }

    // 确保目录存在
    if (!fs.existsSync(playlistsDir)) {
        fs.mkdirSync(playlistsDir, { recursive: true });
    }

    // 将歌单保存为 JSON 文件
    const playlistPath = path.join(playlistsDir, `#${newNumber}.json`);
    fs.writeFileSync(playlistPath, JSON.stringify(playlistTemplate, null, 2), 'utf-8');

    console.log('Playlist imported and saved successfully.');
}

export {
    getPlaylists,
    generateNewPlaylistNumber,
    extractMusicMeta,
    parseTrackInfo,
    addTrackToLibrary,
    creatNewEmptyPlaylist,
    importPlaylistFromList
};
