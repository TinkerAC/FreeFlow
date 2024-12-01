import { dbGet, dbRun } from '@src/utils/dbUtils';
import sqlite3 from 'sqlite3';

export async function isTrackInLibrary(track: any, db: sqlite3.Database) {

  if (!track || (!track.data_href && !track.file_path)) {
    throw new Error(`track对象无效，data_href: ${track.data_href}, file_path: ${track.file_path}`);
  }

  const row: any = await dbGet(db, 'SELECT track_id FROM library WHERE data_href = ? OR file_path = ?', [track.data_href, track.file_path]);

  if (row) {
    console.log('待添加的音乐已在库中，track_id:', row.track_id);
    return row.track_id;
  } else {
    return null;
  }
}

export async function addTrackToLibrary(track: any, db: sqlite3.Database) {
  //出错时回滚
  try {
    // 开始事务
    await dbRun(db, 'BEGIN TRANSACTION;');
    // 插入新歌曲
    const insertSql = 'INSERT INTO library (data_href, file_path, title, artist, album, duration, cover_src) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const runResult: any = await dbRun(db, insertSql, [track.data_href, track.file_path, track.title, track.artist, track.album, track.duration, track.cover_src]);

    console.log(`新歌曲插入音乐库成功，track_id: ${runResult.lastID}`);

    // 提交事务
    await dbRun(db, 'COMMIT;');

    return runResult.lastID;
  } catch (err) {
    console.error('添加音乐到库时出错:', err.message);
    // 回滚事务
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }
}


export async function removeTrackFromLibrary(trackId: number, db: sqlite3.Database) {
  try {
    await dbRun(db, 'BEGIN TRANSACTION;');
    await dbRun(db, 'DELETE FROM library WHERE track_id = ?', [trackId]);
    await dbRun(db, 'DELETE FROM playlist_track WHERE track_id = ?', [trackId]);
    await dbRun(db, 'COMMIT;');
  } catch (err) {
    console.error('从库中删除音乐时出错:', err.message);
    await dbRun(db, 'ROLLBACK;');
    throw err;
  }
}


// const track = {
//     "file_path": "",
//     "data_href": "thread-17048.htm"
// };
// //
//
// await isTrackInLibrary(
//     track
//     , await getDatabase("D:\\Workplace\\NodeProject\\Spotify\\data\\database.sqlite"));