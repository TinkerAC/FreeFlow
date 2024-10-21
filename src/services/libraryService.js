import {dbGet} from "../utils/dbUtils.js";

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

// const track = {
//     "file_path": "",
//     "data_href": "thread-17048.htm"
// };
// //
//
// await isTrackInLibrary(
//     track
//     , await getDatabase("D:\\Workplace\\NodeProject\\Spotify\\data\\database.sqlite"));