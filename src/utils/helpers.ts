import fs from 'fs/promises';
import { OS } from '@main/core/enum/Platform';

/**
 * Checks if process NODE_ENV in 'development' mode
 */
export function inDev(): boolean {
  return process.env.NODE_ENV == 'development';
}


// 帮助函数：检查文件或目录是否存在
export const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};


export function getOperatingSystem(): OS {
  const platform = process.platform;
  switch (platform) {
    case 'win32':
      return OS.WINDOWS;
    case 'darwin':
      return OS.MACOS;
    case 'linux':
      return OS.LINUX;
    case 'android':
      return OS.ANDROID;
    default:
      return OS.UNKNOWN;
  }
}