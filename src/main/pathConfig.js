// pathConfig.js
import path from 'path';
import {app} from 'electron';
import {fileURLToPath} from "url";

const environment = process.env.NODE_ENV;


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const dataPath =
    environment === 'development'
        ? path.join(__dirname, '..', '..', 'data')
        : path.join(app.getPath('userData'), 'data');

const playlistsDir = path.join(dataPath, 'playlists');
const playerStateDumpFile = path.join(dataPath, 'playerState.json');
const dbFile = path.join(dataPath, 'database.sqlite');

export {
    environment,
    dataPath,
    playlistsDir,
    playerStateDumpFile,
    dbFile
};
