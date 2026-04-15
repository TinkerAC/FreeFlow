import path from 'path';
import fs from 'fs';
import { ensureProfilePath, loadProfileIndex } from '@main/core/profileStore';
import { app } from 'electron';

export interface DataPath {
  rootDataPath: string;
  profileId: string;
  profilePath: string;
  dataPath: string;
  musicCacheDir: string;
  playerStateDumpFile: string;
  dbPath: string;
  musicDir: string;
}

const environment = process.env.NODE_ENV || 'production';

const root_Data_Path =
  environment === 'development'
    ? path.join(__dirname, '..', '..', 'data')
    : path.join(app.getPath('userData'), 'data');

export function ensureRootDataPath(): void {
  if (!fs.existsSync(root_Data_Path)) {
    fs.mkdirSync(root_Data_Path, { recursive: true });
    console.log(`已创建数据目录: ${root_Data_Path}`);
    return;
  }

  console.log(`数据目录已存在: ${root_Data_Path}`);
}

ensureRootDataPath();

const profileIndex = loadProfileIndex(root_Data_Path);
const active_Profile_Id = profileIndex.activeProfileId;
const profile_Path = ensureProfilePath(root_Data_Path, active_Profile_Id);

//存放播放中加载的音乐
const music_Cache_Dir: string = path.join(profile_Path, 'fileCache');
const playerState_DumpFile: string = path.join(profile_Path, 'playerState.json');
const db_Path: string = path.join(profile_Path, 'database.sqlite');

//存放用户下载的音乐
const music_Dir: string = path.join(profile_Path, 'music');

for (const dir of [music_Cache_Dir, music_Dir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const AppDataPath: DataPath = {
  rootDataPath: root_Data_Path,
  profileId: active_Profile_Id,
  profilePath: profile_Path,
  dataPath: profile_Path,
  dbPath: db_Path,
  musicCacheDir: music_Cache_Dir,
  musicDir: music_Dir,
  playerStateDumpFile: playerState_DumpFile,
};

export { environment, root_Data_Path, db_Path, AppDataPath };
