import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export const environment = process.env.NODE_ENV || 'production';

export const root_Data_Path =
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
