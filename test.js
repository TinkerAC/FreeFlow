import {dbRun, getDatabase} from "./src/utils/dbUtils.js";
import fs from "fs";


async function importTest() {
    // const db = getDatabase('data/database.sqlite');
    const db = await getDatabase('data/database.sqlite');
    const json_list = fs.readFileSync('data/playlists/library.json', 'utf-8');


    const result = JSON.parse(json_list);

    const tracks = result.tracks;

    console.log(tracks);

    let file_path;
    let data_href;
    let created_at;
    tracks.forEach(track => {
        file_path = track.file_path || '';
        created_at = track.created_at || '';
        data_href = track.data_href || '';
        console.log(file_path);
        console.log(created_at);
        console.log(data_href);

        dbRun(db, "INSERT INTO library (data_href, file_path) VALUES (?,?)", [data_href, file_path]);


    });


}

// importTest().then();