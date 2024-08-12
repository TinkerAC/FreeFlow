import fs from 'fs';
import * as mm from 'music-metadata';

function getPlaylists() {
    const playlists = fs.readdirSync('./data/playlists');
    return playlists.map(playlist => {
        const data = fs.readFileSync(`./data/playlists/${playlist}`, 'utf-8');
        return JSON.parse(data);
    });// 返回歌单列表
}

function generateNewPlaylistNumber() {
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
    return maxNum + 1; // 返回新歌单的编号
}


function getMusicMetaInfo(filePath) {
    return new Promise((resolve, reject) => {
        mm.parseFile(filePath, {native: true})
            .then(metadata => {
                // 检查是否存在封面图片
                if (metadata.common.picture && metadata.common.picture.length > 0) {
                    // 获取第一个封面图片
                    const picture = metadata.common.picture[0];

                    // 将 Uint8Array 转换为 Buffer 对象
                    const buffer = Buffer.from(picture.data);

                    const base64String = buffer.toString('base64');
                    // 确保使用正确的 MIME 类型格式
                    const mimeType = picture.format || 'image/jpeg';
                    // 将 Base64 图片添加到返回的 metadata 对象中
                    metadata.common.base64Cover = `data:${mimeType};base64,${base64String}`;
                }

                // 返回包含 Base64 编码图片数据的元数据
                resolve(metadata);
            })
            .catch(err => {
                reject(err);
            });
    });
}


export {getPlaylists, generateNewPlaylistNumber, getMusicMetaInfo};


