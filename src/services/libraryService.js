import {dbGet, dbRun} from "../utils/dbUtils.js";

export async function isTrackInLibrary(track, db) {

    if (!track || (!track.data_href && !track.file_path)) {
        throw new Error(`track对象无效，data_href: ${track.data_href}, file_path: ${track.file_path}`);
    }

    const row = await dbGet(db, 'SELECT track_id FROM library WHERE data_href = ? OR file_path = ?', [track.data_href, track.file_path]);

    if (row) {
        console.log('待添加的音乐已在库中，track_id:', row.track_id);
        return row.track_id;
    } else {
        return null;
    }
}

export async function addTrackToLibrary(track, db) {
    //出错时回滚
    try {
        // 开始事务
        await dbRun(db, 'BEGIN TRANSACTION;');
        // 插入新歌曲
        const insertSql = 'INSERT INTO library (data_href, file_path, title, artist, album, duration, cover_src) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const trackId = await dbRun(db, insertSql, [track.data_href, track.file_path, track.title, track.artist, track.album, track.duration, track.cover_src]);
        console.log(`新歌曲插入成功，track_id: ${trackId}`);

        // 提交事务
        await dbRun(db, 'COMMIT;');

        return trackId;
    } catch (err) {
        console.error('添加音乐到库时出错:', err.message);
        // 回滚事务
        await dbRun(db, 'ROLLBACK;');
        throw err;
    }
}


export async function removeTrackFromLibrary(trackId, db) {
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