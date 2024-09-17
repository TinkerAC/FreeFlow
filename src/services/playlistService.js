import fs from 'fs';
import * as mm from 'music-metadata';
import path from 'path';
import {fileURLToPath} from "url";

// 创建 __dirname 等效变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 构建从项目根目录的路径
// 使用 `..` 来跳出 `src/services` 文件夹，访问 `Spotify/data/playlists`
const playlistsDir = path.resolve(__dirname, '../../data/playlists');

// 获取歌单列表
function getPlaylists() {
    try {
        // 检查目录是否存在，如果不存在则创建
        if (!fs.existsSync(playlistsDir)) {
            fs.mkdirSync(playlistsDir, {recursive: true}); // 递归创建目录
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


function addTrackToLibrary(track) {
    const libraryPath = './data/playlists/library.json';

    const library = JSON.parse(fs.readFileSync('./data/playlists/library.json', 'utf-8'));
    library.tracks.push(track);

    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
    console.log(`Track added to library: ${track.title}`);
}


/**
 * 获取图像 Buffer，支持网络链接和 base64 数据
 * @param {string} src - 图片的 src，可能是链接或 base64
 * @returns {Promise<Buffer>} - 图像的 Buffer
 */
async function getImageBuffer(src) {
    if (src.startsWith('http')) {
        // 如果是网络链接，下载图片
        const response = await axios.get(src, {responseType: 'arraybuffer'});
        return Buffer.from(response.data, 'binary');
    } else if (src.startsWith('data:image')) {
        // 如果是 base64 数据，解析 base64 图片
        const base64Data = src.split(',')[1];
        return Buffer.from(base64Data, 'base64');
    } else {
        throw new Error('Invalid image src format');
    }
}

/**
 * 拼接图片并保存
 * @param {Array<string>} imageSources - 图片 src 数组
 * @param {string} outputFilePath - 输出图片的路径
 */
async function mergeImages(imageSources, outputFilePath) {
    const imageBuffers = await Promise.all(imageSources.map(src => getImageBuffer(src)));

    // 读取每张图片的 metadata，确保图片大小相同
    const imageMetas = await Promise.all(imageBuffers.map(buffer => sharp(buffer).metadata()));
    const width = imageMetas[0].width;
    const height = imageMetas[0].height;

    // 如果图像大小不一致，可以先调整到相同大小
    const resizedImages = await Promise.all(
        imageBuffers.map(buffer => sharp(buffer).resize(width, height).toBuffer())
    );

    // 拼接成 2x2 的图片网格
    const compositeImage = sharp({
        create: {
            width: width * 2,
            height: height * 2,
            channels: 4,
            background: {r: 255, g: 255, b: 255, alpha: 0}
        }
    }).composite([
        {input: resizedImages[0], top: 0, left: 0},            // 左上
        {input: resizedImages[1], top: 0, left: width},         // 右上
        {input: resizedImages[2], top: height, left: 0},        // 左下
        {input: resizedImages[3], top: height, left: width}     // 右下
    ]);

    // 保存拼接后的图片
    await compositeImage.toFile(outputFilePath);
}

/**
 * 主函数：处理歌单中的图像
 * @param {number} playlistId - 歌单编号
 * @param {string} jsonPath - 歌单 JSON 文件路径
 * @param {string} outputFilePath - 输出图片的保存路径
 */
async function processPlaylistImages(playlistId, outputFilePath) {
    // 读取歌单 JSON 文件
    const playlist = await fs.readJson(`./data/playlists/#${playlistId}.json`);
    const tracks = playlist.tracks;
    const cover_status = playlist.cover_status;


    if (!tracks || tracks.length === 0) {
        throw new Error('The playlist contains no tracks');
    }

    if (tracks.length < 4) {
        // 如果 tracks 数量小于 4，使用第一首歌曲的封面
        const firstCoverSrc = tracks[0].cover_src;
        const firstCoverBuffer = await getImageBuffer(firstCoverSrc);
        await sharp(firstCoverBuffer).toFile(outputFilePath);
        console.log(`Saved first track cover as: ${outputFilePath}`);
    } else {
        // 如果 tracks 数量大于等于 4，拼接前 4 首的封面图
        const coverSources = tracks.slice(0, 4).map(track => track.cover_src);
        await mergeImages(coverSources, outputFilePath);
        console.log(`Saved merged image as: ${outputFilePath}`);
    }
}

// // 示例调用
// const playlistId = 12345;
// const jsonPath = './playlist.json';  // 假设歌单 JSON 存在该路径
// const outputFilePath = path.join(__dirname, `playlist_${playlistId}_cover.png`);
//
// processPlaylistImages(playlistId, jsonPath, outputFilePath)
//   .then(() => console.log('Image processing completed.'))
//   .catch(err => console.error('Error processing playlist images:', err));
//
//


export {getPlaylists, generateNewPlaylistNumber, extractMusicMeta, parseTrackInfo, addTrackToLibrary};


// 测试 extractMusicMeta 和 parseTrackInfo 函数
// extractMusicMeta('E:\\Music\\Kurt Hugo Schneider,Sam Tsui,Casey Breves - All Time Low.flac')
//     .then(metadata => {
//         const parsedData = parseTrackInfo(metadata);
//         console.log(parsedData);
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });

// 测试 getPlaylists 函数

// console.log(getPlaylists());

