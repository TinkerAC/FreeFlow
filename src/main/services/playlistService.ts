import * as mm from 'music-metadata';
import { getSearchResults } from '@main/services/hifiniMusicService';
import { dbAll, dbRun } from '@src/utils/dbUtils';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { addTrackToLibrary } from '@main/services/libraryService';

async function checkLocalTrackExistence(track: any) {
  return fs.existsSync(track.file_path);
}

// 获取歌单列表
// 获取歌单列表
async function getPlaylists(db: sqlite3.Database,
) {
  try {
    // Step 1: 获取库中的所有 Track，并检查文件是否存在
    const libraryTracks: any = await dbAll(db, 'SELECT * FROM library');
    const validTracks: any[] = [];

    for (const track of libraryTracks) {
      if (track.file_path && !track.data_href) { // 仅检查本地文件的歌曲
        track.file_exist = await checkLocalTrackExistence(track);
        if (!track.file_exist) {
          console.warn(`歌曲文件不存在: ${track.file_path}，在此设备上无法播放`);
        } else {
          validTracks.push(track); // 仅保留存在的文件
        }
      } else {
        validTracks.push(track); // 网络资源直接保留
      }
    }

    console.log(`库中有效歌曲数量: ${validTracks.length} / ${libraryTracks.length}`);

    // Step 2: 获取所有歌单的基本信息
    const playlists: any = await dbAll(db, 'SELECT * FROM playlists');

    // Step 3: 获取每个歌单对应的歌曲列表，并过滤无效歌曲
    for (const playlist of playlists) {
      const playlistTracks: any = await dbAll(
        db,
        'SELECT * FROM library WHERE track_id IN (SELECT track_id FROM playlist_detail WHERE playlist_id = ?)',
        [playlist.playlist_id],
      );

      // 过滤不存在的歌曲
      playlist.tracks = playlistTracks.filter((track: any) => validTracks.some(valid => valid.track_id === track.track_id));
      console.log(`歌单: ${playlist.title} 获取到有效歌曲数量: ${playlist.tracks.length}`);
    }

    // Step 4: 添加音乐库歌单
    playlists.push({
      playlist_id: 0, // 特殊 ID，代表整个音乐库
      title: '音乐库',
      creator: 'System',
      tracks: validTracks,
    });

    console.log(`共获取到歌单数量: ${playlists.length}`);
    return playlists;
  } catch (err) {
    // 错误处理：捕获并记录所有错误
    console.error('从数据库读取歌单时出错:', err);
    return [];
  }
}

// 获取音乐文件的元数据
async function extractMusicMeta(file_path: string) {
  try {
    return await mm.parseFile(file_path);
  } catch (error) {
    console.error('Error reading metadata:', error);
    throw error;
  }
}

function parseTrackInfo(metadata: any) {
  // 提取封面图片并转为Base64
  let coverBase64 = null;
  if (metadata.common.picture && metadata.common.picture.length > 0) {
    const picture = metadata.common.picture[0]; // 通常封面是第一个图片
    const buffer = Buffer.from(picture.data);

    coverBase64 = `data:${picture.format};base64,${buffer.toString('base64')}`;
  }
  // 构建目标JSON对象
  return {
    cover_src: coverBase64,
    title: metadata.common.title || 'Unknown Title',
    artist: metadata.common.artist || 'Unknown Artist',
    album: metadata.common.album || 'Unknown Album',
    duration: metadata.format.duration || 0,
  };
}


async function addTrackToPlaylist(db: sqlite3.Database
  , playlistId: number
  , trackId: number,
) {

  //参数检查
  if (!playlistId || !trackId) {
    throw new Error('playlistId 和 trackId 不能为空');
  }


  try {
    // 开始事务
    await dbRun(db, 'BEGIN TRANSACTION;');

    // 插入新歌曲
    const insertSql = 'INSERT INTO playlist_detail (playlist_id, track_id) VALUES (?, ?)';
    await dbRun(db, insertSql, [playlistId, trackId]);
    console.log(`新歌曲插入成功，playlist_id: ${playlistId}, track_id: ${trackId}`);

    // 提交事务
    await dbRun(db, 'COMMIT;');
  } catch (err) {
    console.error('添加音乐到歌单时出错:', err.message);
    // 回滚事务
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }

}


async function creatNewEmptyPlaylist(
  db: sqlite3.Database,
  creator: string,
) {
  try {
    // 开始事务
    await dbRun(db, 'BEGIN TRANSACTION;');

    // 插入新歌单，使用临时标题
    const insertSql = 'INSERT INTO playlists (playlist_cover, title, creator) VALUES (?, ?, ?)';
    const runResult: any = await dbRun(db, insertSql, [null, '未命名歌单', creator]);
    console.log(`新播放列表插入成功，playlist_id: ${runResult.lastID}`);

    // 更新歌单标题，包含 playlistId
    const newTitle = `未命名歌单${runResult.lastID}`;
    const updateSql = 'UPDATE playlists SET title = ? WHERE playlist_id = ?';
    await dbRun(db, updateSql, [newTitle, runResult.lastID]);
    console.log(`播放列表标题更新为: ${newTitle}`);

    // 提交事务
    await dbRun(db, 'COMMIT;');

    return runResult.lastID;
  } catch (err) {
    console.error('创建新歌单时出错:', err.message);
    // 回滚事务
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }
}


async function importPlaylistFromList(db: sqlite3.Database, playlist: any, store: any) {

  // 从列表中提取歌曲信息
  const unbind_tracks = playlist.split('\n').map((line: any) => {
    const [title, artist] = line.split('-').map((s: any) => s.trim());
    return { title, artist };
  });

  const length = unbind_tracks.length;
  let tracks: any = [];
  // 从 hifini 网站获取歌曲信息
  for (const [index, track] of unbind_tracks.entries()) {
    try {
      const searchResults = await getSearchResults(`${track.title} ${track.artist}`, db, store);
      console.log(`正在处理第${index + 1}/${length}首歌曲: ${track.title} - ${track.artist}`);

      if (searchResults.length > 0) {
        const firstResult = searchResults[0];
        tracks.push({
          data_href: firstResult.data_href,
          //@ts-ignore
          file_path: null,
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

  // 插入歌曲到库
  for (const track of tracks) {
    try {
      const trackId: any = await addTrackToLibrary(track, db);
      console.log(`成功添加${track.title} - ${track.artist}到库，track_id: ${trackId}`);
    } catch (error) {
      console.log(`添加${track.title} - ${track.artist}到库失败`);
    }
  }


}


async function modifyPlaylist(db: sqlite3.Database
  , playlistId: number
  , playlist_title: string
  , playlist_description: string,
) {
  try {
    // 更新歌单信息
    await dbRun(db, 'UPDATE playlists SET title = ?, description = ? WHERE playlist_id = ?', [playlist_title, playlist_description, playlistId]);
    console.log('歌单修改成功');
    return true;
  } catch (err) {
    console.error('修改歌单信息时出错:', err.message);
    throw err;

  }
}


async function removeTrackFromPlaylist(db: sqlite3.Database
  , playlistId: number
  , trackId: number,
) {

  if (!playlistId || !trackId) {
    throw new Error('playlistId 和 trackId 不能为空');
  }

  try {
    // 开始事务
    await dbRun(db, 'BEGIN TRANSACTION;');

    // 删除歌曲
    const deleteSql = 'DELETE FROM playlist_detail WHERE playlist_id = ? AND track_id = ?';
    await dbRun(db, deleteSql, [playlistId, trackId]);
    console.log(`歌曲删除成功，playlist_id: ${playlistId}, track_id: ${trackId}`);

    // 提交事务
    await dbRun(db, 'COMMIT;');
  } catch (err) {
    console.error('删除歌曲时出错:', err.message);
    // 回滚事务
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }
}


async function removePlaylist(db: sqlite3.Database, playlistId: number) {
  try {
    // 开始事务
    await dbRun(db, 'BEGIN TRANSACTION;');

    // 删除歌单
    const deleteSql = 'DELETE FROM playlists WHERE playlist_id = ?';
    await dbRun(db, deleteSql, [playlistId]);
    console.log(`歌单删除成功，playlist_id: ${playlistId}`);// 由于外键约束存在, 删除歌单时会自动删除歌单详情中的记录

    // 提交事务
    await dbRun(db, 'COMMIT;');
  } catch (err) {
    console.error('删除歌单时出错:', err.message);
    // 回滚事务
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }
}

export {
  getPlaylists,
  extractMusicMeta,
  parseTrackInfo,
  creatNewEmptyPlaylist,
  importPlaylistFromList,
  addTrackToPlaylist,
  modifyPlaylist,
  removeTrackFromPlaylist,
  removePlaylist,
};

//
// importPlaylistFromList(await getDatabase('D:\\Workplace\\NodeProject\\Spotify\\data\\database.sqlite'), "夢灯籠 - RADWIMPS\n" +
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
