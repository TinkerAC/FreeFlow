// file: src/main/pathConfig.ts
import path from 'path';
import { app } from 'electron';
import fs from 'fs';


export interface DataPath {
  dataPath: string;
  musicCacheDir: string;
  playerStateDumpFile: string;
  dbPath: string;
  musicDir: string;
}

const environment = process.env.NODE_ENV || 'production';
const appPath = app.getAppPath();
const assetRoot = app.isPackaged
  ? path.join(process.resourcesPath, 'appIcons')
  : path.join(appPath, 'assets', 'appIcons');

const data_Path =
  environment === 'development'
    ? path.join(__dirname, '..', '..', 'data')
    : path.join(app.getPath('userData'), 'data');

// 创建路径(如果不存在)
if (!fs.existsSync(data_Path)) {
  fs.mkdirSync(data_Path, { recursive: true });
  console.log(`已创建数据目录: ${data_Path}`);
} else {
  console.log(`数据目录已存在: ${data_Path}`);
}

//存放播放中加载的音乐
const music_Cache_Dir: string = path.join(data_Path, 'fileCache');
const playerState_DumpFile: string = path.join(data_Path, 'playerState.json');
const db_Path: string = path.join(data_Path, 'database.sqlite');

//存放用户下载的音乐
const music_Dir: string = path.join(data_Path, 'music');
const AppDataPath: DataPath = {
  dataPath: data_Path,
  dbPath: db_Path,
  musicCacheDir: music_Cache_Dir,
  musicDir: music_Dir,
  playerStateDumpFile: playerState_DumpFile,
};

function resolveAppIconPath(fileName: string): string {
  return path.join(assetRoot, fileName);
}

export { environment, data_Path, db_Path, AppDataPath, resolveAppIconPath };
