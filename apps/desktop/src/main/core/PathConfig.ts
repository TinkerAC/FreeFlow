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

function ensureProfileDirs(dataPath: DataPath): void {
  for (const dir of [dataPath.musicCacheDir, dataPath.musicDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function createDataPathForProfile(rootDataPath: string, profileId: string): DataPath {
  const profilePath = ensureProfilePath(rootDataPath, profileId);

  return {
    rootDataPath,
    profileId,
    profilePath,
    dataPath: profilePath,
    dbPath: path.join(profilePath, 'database.sqlite'),
    musicCacheDir: path.join(profilePath, 'fileCache'),
    musicDir: path.join(profilePath, 'music'),
    playerStateDumpFile: path.join(profilePath, 'playerState.json'),
  };
}

const initialProfileIndex = loadProfileIndex(root_Data_Path);
const AppDataPath: DataPath = createDataPathForProfile(root_Data_Path, initialProfileIndex.activeProfileId);
ensureProfileDirs(AppDataPath);

export function configureActiveProfileDataPath(profileId: string): DataPath {
  const nextDataPath = createDataPathForProfile(root_Data_Path, profileId);
  ensureProfileDirs(nextDataPath);

  Object.assign(AppDataPath, nextDataPath);
  return AppDataPath;
}

export { environment, root_Data_Path, AppDataPath };
