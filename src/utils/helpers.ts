import fs from 'fs/promises';

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