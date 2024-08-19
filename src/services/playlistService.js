import fs from 'fs';
import * as mm from 'music-metadata';

// 获取歌单列表
function getPlaylists() {
    try {
        const playlists = fs.readdirSync('./data/playlists');

        return playlists.map(playlist => {
            try {
                const data = fs.readFileSync(`./data/playlists/${playlist}`, 'utf-8');
                return JSON.parse(data);
            } catch (err) {
                console.error(`Error reading playlist file: ${playlist}`, err);
                return null; // 处理读取或解析失败的情况
            }
        }).filter(playlist => playlist !== null); // 过滤掉无效的歌单
    } catch (err) {
        console.error('Error reading playlists directory:', err);
        return []; // 处理读取目录失败的情况，返回空数组
    }
}

// 生成新歌单的编号
function generateNewPlaylistNumber() {
    try {
        const nameList = fs.readdirSync('./data/playlists');
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
function getMusicMetaInfo(filePath) {
    return new Promise((resolve, reject) => {
        mm.parseFile(filePath, {native: true})
            .then(metadata => {
                try {
                    // 检查是否存在封面图片
                    if (metadata.common.picture && metadata.common.picture.length > 0) {
                        const picture = metadata.common.picture[0];
                        const buffer = Buffer.from(picture.data);
                        const base64String = buffer.toString('base64');
                        const mimeType = picture.format || 'image/jpeg';
                        metadata.common.base64Cover = `data:${mimeType};base64,${base64String}`;
                    }
                    resolve(metadata);
                } catch (err) {
                    console.error('Error processing music metadata:', err);
                    reject(err); // 处理封面图像转换或其他错误
                }
            })
            .catch(err => {
                console.error('Error parsing music file:', filePath, err);
                reject(err); // 处理文件解析错误
            });
    });
}

export {getPlaylists, generateNewPlaylistNumber, getMusicMetaInfo};
