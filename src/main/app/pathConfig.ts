// file: src/main/pathConfig.ts
import path from 'path';
import { app } from 'electron';
import fs from 'fs';



const environment = process.env.NODE_ENV || 'production';

const dataPath =
  environment === 'development'
    ? path.join(__dirname, '..', '..', 'data')
    : path.join(app.getPath('userData'), 'data');

// 创建路径(如果不存在)
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
  console.log(`已创建数据目录: ${dataPath}`);
} else {
  console.log(`数据目录已存在: ${dataPath}`);
}

const playlistsDir = path.join(dataPath, 'playlists');
const playerStateDumpFile = path.join(dataPath, 'playerState.json');
const dbPath = path.join(dataPath, 'database.sqlite');

export { environment, dataPath, playlistsDir, playerStateDumpFile, dbPath };