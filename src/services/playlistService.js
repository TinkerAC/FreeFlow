import fs from 'fs';
import * as mm from 'music-metadata';
import path from 'path';
import {fileURLToPath} from "url";
import config from "config";

import {getSearchResults} from "./hifiniMusicService.js";




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


function addTrackToLibrary(track) {
    const libraryPath = './data/playlists/library.json';

    const library = JSON.parse(fs.readFileSync('./data/playlists/library.json', 'utf-8'));
    library.tracks.push(track);

    fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2));
    console.log(`Track added to library: ${track.title}`);
}


function creatNewEmptyPlaylist() {
    // 生成新歌单编号
    const newNumber = generateNewPlaylistNumber();

    // 创建歌单模板
    const playlistTemplate = {
        imgSrc: 'https://placehold.co/50x50',
        title: `未命名歌单 #${newNumber}`,
        creater: '未知',
        createdAt: new Date().toISOString(),
        type: '歌单',
        songs: [],
    };

    const playlistDir = path.join(__dirname, 'data', 'playlists');

    // 确保目录存在
    if (!fs.existsSync(playlistDir)) {
        fs.mkdirSync(playlistDir, {recursive: true});
    }

    // 将歌单保存为 JSON 文件
    fs.writeFileSync(
        path.join(playlistDir, `#${newNumber}.json`),
        JSON.stringify(playlistTemplate, null, 2),
        'utf-8'
    );
}

async function importPlaylistFromList(playlist) {
    // 从每行为"歌曲名"- "歌手名"的列表中导入歌单

    // 生成新歌单编号
    const newNumber = generateNewPlaylistNumber();

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
        return {title, artist};
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

    // 保存歌单
    const playlistDir = path.join(__dirname, 'data', 'playlists');

    // 确保目录存在
    if (!fs.existsSync(playlistDir)) {
        fs.mkdirSync(playlistDir, {recursive: true});
    }

    // 将歌单保存为 JSON 文件
    const playlistPath = path.join(playlistDir, `#${newNumber}.json`);
    fs.writeFileSync(playlistPath, JSON.stringify(playlistTemplate, null, 2), 'utf-8');

    console.log('Playlist imported and saved successfully.');
}

export {
    getPlaylists,
    generateNewPlaylistNumber,
    extractMusicMeta,
    parseTrackInfo,
    addTrackToLibrary,
    creatNewEmptyPlaylist
};



// importPlaylistFromList("夢灯籠 - RADWIMPS\n" +
//     "夜的钢琴曲五 - 邓壬鑫\n" +
//     "想い出は遠くの日々 - 天門\n" +
//     "二人の時間 - RADWIMPS\n" +
//     "Someone Like You - Adele\n" +
//     "Because of You - Kelly Clarkson\n" +
//     "一样的月光 - 徐佳莹\n" +
//     "美人鱼 - 林俊杰\n" +
//     "年少有为 - 李荣浩\n" +
//     "如果爱忘了 - 戚薇\n" +
//     "默 - 那英\n" +
//     "前前前世 绝美钢琴抒情柔版(翻自 RADWIMPS)(cover) - 至尊马甲\n" +
//     "小情歌 (苏打绿版) - 苏打绿\n" +
//     "I Really Want to Stay At Your House - Rosa Walton / Hallie Coggins\n" +
//     "world.execute (me) ; - Mili\n" +
//     "Letting Go - 蔡健雅\n" +
//     "So Far Away - Martin Garrix / David Guetta / Jamie Scott / Romy Dya\n" +
//     "昨日青空 - 尤长靖\n" +
//     "Please Don't Go - Joel Adams\n" +
//     "向云端 - 小霞 / 海洋Bo\n" +
//     "命运 - 家家\n" +
//     "Dream It Possible - Delacey\n" +
//     "I Try So Hard - Daniel JM\n" +
//     "慢慢喜欢你 - 莫文蔚\n" +
//     "我们 - 陈奕迅\n" +
//     "麻雀 - 李荣浩\n" +
//     "哪里都是你 - 队长\n" +
//     "僕が死のうと思ったのは - 中島美嘉\n" +
//     "说散就散 - JC 陈咏桐\n" +
//     "Empty Love - Lulleaux / Kid Princess\n" +
//     "Take Flight - Lindsey Stirling\n" +
//     "尘埃 - 家家\n" +
//     "侧脸 - 于果\n" +
//     "化身孤岛的鲸 - 周深\n" +
//     "至少还有你 - 林忆莲\n" +
//     "传奇 - 王菲\n" +
//     "后来 - 刘若英\n" +
//     "时间煮雨 - 郁可唯\n" +
//     "给电影人的情书 - 单依纯\n" +
//     "Let Me Down Slowly - Alec Benjamin / Alessia Cara\n" +
//     "身骑白马 - 徐佳莹\n" +
//     "Hallelujah - Alexandra Burke\n" +
//     "是风动 - 银临 / 河图\n" +
//     "BLUE - Troye Sivan / Alex Hope\n" +
//     "Counting Stars - OneRepublic\n" +
//     "I'm In Here - Sia\n" +
//     "Hello - Adele\n" +
//     "多远都要在一起 - G.E.M.邓紫棋\n" +
//     "手掌心 - 丁当\n" +
//     "すずめ feat.十明 - RADWIMPS / 十明\n" +
//     "背对背拥抱 - 林俊杰\n" +
//     "情歌 - 梁静茹\n" +
//     "Five Hundred Miles - Justin Timberlake / Carey Mulligan / Stark Sands\n" +
//     "Try - Colbie Caillat\n" +
//     "偏爱 - 张芸京\n" +
//     "Free Loop - Daniel Powter\n" +
//     "最美的太阳 - 张杰\n" +
//     "明天过后 - 张杰\n" +
//     "夕日坂 - doriko / 初音ミク\n" +
//     "ブルーバード - いきものがかり\n" +
//     "千本桜 - 黒うさP / 初音ミク\n" +
//     "遇见 - 孙燕姿\n" +
//     "匆匆那年 - 王菲\n" +
//     "Illusionary Daytime - Shirfine\n" +
//     "See You Again - Wiz Khalifa / Charlie Puth\n" +
//     "左手指月 - 萨顶顶\n" +
//     "背对背拥抱 - 林俊杰\n" +
//     "江南 - 林俊杰\n" +
//     "不为谁而作的歌 - 林俊杰\n" +
//     "修炼爱情 - 林俊杰\n" +
//     "她说 - 林俊杰\n" +
//     "孤勇者 - 陈奕迅\n" +
//     "起风了 - 吴青峰\n" +
//     "忘记时间 - 胡歌\n" +
//     "Outside - Calvin Harris / Ellie Goulding\n" +
//     "Nightingale - Yanni\n" +
//     "后会无期 - G.E.M.邓紫棋\n" +
//     "清明上河图 - 李玉刚\n" +
//     "海底（Live） - 凤凰传奇\n" +
//     "失语者 - 蔡健雅\n" +
//     "万疆 - 李玉刚\n" +
//     "时光背面的我 - 刘至佳 / 韩瞳\n" +
//     "如愿 - 葱香科学家（王悠然）\n" +
//     "在你的身边 - 盛哲\n" +
//     "风的季节 - 徐小凤\n" +
//     "朝汐 - 音葉 / 洛天依Official\n" +
//     "阴天快乐 - 陈奕迅\n" +
//     "红玫瑰 - 陈奕迅\n" +
//     "富士山下 - 陈奕迅\n" +
//     "水星记 - 郭顶\n" +
//     "なんでもないや (movie ver.) - RADWIMPS\n" +
//     "可惜没如果 - 林俊杰\n" +
//     "浪漫血液 - 林俊杰\n" +
//     "Sosso - Magnus Ludvigsson\n" +
//     "栖枝 - 双笙（陈元汐）\n" +
//     "浮生未歇 - 音频怪物\n" +
//     "Farewell: \"Ten Easy Pieces for Piano\" - Leszek Mozdzer / Zbigniew Preisner\n" +
//     "错位时空 - 艾辰\n" +
//     "Windfall - TheFatRat\n" +
//     "Luv Letter - TSUKINOSORA\n" +
//     "明天你好 - 牛奶咖啡\n" +
//     "China-X - 徐梦圆\n" +
//     "绅士 - 薛之谦\n" +
//     "三葉のテーマ - RADWIMPS\n" +
//     "かたわれ時 - RADWIMPS\n" +
//     "Without You I Am Dying - Painless Destiny\n" +
//     "Shape of You - Ed Sheeran\n" +
//     "Sakae In Action - 松本晃彦\n" +
//     "【洛天依】影子小姐 - 著小生zoki / 洛天依Official\n" +
//     "老街北 - 闹闹丶 / FFF君 / 小欧Ω / 洛天依Official\n" +
//     "Flower Dance - DJ Okawari\n" +
//     "Coming Home - Peter Jeremias\n" +
//     "The truth that you leave - Pianoboy高至豪\n" +
//     "Xenogenesis - TheFatRat\n" +
//     "雪落下的声音 - 张穆庭\n" +
//     "Peter Jeremias-Coming Home（NotintroYet remix） - notintroyet\n" +
//     "Dusk - Peter Jeremias\n" +
//     "天ノ弱 -うぃんぐPiano Ver.- - Akie秋绘\n" +
//     "夏に花が散る - 羽肿\n" +
//     "Horizon - Janji\n" +
//     "Intro - Dreamtale\n" +
//     "大鱼 - 周深\n" +
//     "ヨスガノソラ メインテーマ -遠い空へ- - 市川淳\n" +
//     "勾指起誓 - 洛天依Official / ilem\n" +
//     "优美的小调(钢琴曲) - 张宇桦\n" +
//     "aLIEz - 瑞葵(mizuki) / SawanoHiroyuki[nZk]\n" +
//     "Motherlode - Kevin MacLeod\n" +
//     "Sonoran Sunset - Zachary Bruno\n" +
//     "ツナ覚醒 - 佐橋俊彦\n" +
//     "刚好遇见你 - 李玉刚\n" +
//     "The Right Path - Thomas Greenberg\n" +
//     "打上花火 - Daoko / 米津玄師\n" +
//     "起风了（Cover 高橋優） - 买辣椒也用券\n" +
//     "Always With Me - 木村弓 / 奥户巴寿\n" +
//     "風の住む街（风居住的街道） - 磯村由紀子\n" +
//     "One Love - 広橋真紀子\n" +
//     "芒种 - 音阙诗听 / 赵方婧\n" +
//     "God is A Girl - Groove Coverage\n" +
//     "NEXT TO YOU - Ken Arai\n" +
//     "好久不见 - 陈奕迅\n" +
//     "烟火里的尘埃 - 华晨宇\n" +
//     "夜空中最亮的星 - 逃跑计划\n" +
//     "虹之间 - 金贵晟\n" +
//     "Monsters - Katie Sky\n" +
//     "East of Eden - Zella Day\n" +
//     "不再见 - 陈学冬\n" +
//     "浮夸 - 陈奕迅\n" +
//     "All Time Low - Kurt Hugo Schneider / Sam Tsui / Casey Breves\n" +
//     "最美的期待 - 周笔畅\n" +
//     "River Flows In You - Martin Ermen\n" +
//     "With an Orchid - Yanni\n" +
//     "canon in d - Brian Crain\n" +
//     "Wolves - Selena Gomez / Marshmello\n" +
//     "Radioactive - William Joseph\n" +
//     "Something Just Like This - The Chainsmokers / Coldplay\n" +
//     "Trip - Axero\n" +
//     "Intro - The xx\n" +
//     "#Lov3 #Ngẫu Hứng - Hoaprox\n" +
//     "Darkside - Alan Walker / Au/Ra / Tomine Harket\n" +
//     "The Spectre - Alan Walker\n" +
//     "Faded - Alan Walker\n" +
//     "All Falls Down - Alan Walker / Noah Cyrus / Digital Farm Animals / Juliander\n" +
//     "Sing Me to Sleep - Alan Walker / Iselin Solheim\n" +
//     "Nevada - Vicetone / Cozi Zuehlsdorff\n" +
//     "\n").then(console.log).catch(console.error);


