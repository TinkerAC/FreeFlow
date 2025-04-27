import * as path from 'path';
import * as fs from 'fs-extra';

interface CacheOptions {
  diskCacheDir: string;   // 缓存文件夹路径
  maxDiskUsageBytes?: number; // 最大磁盘缓存大小（字节），默认为无限制
}

export class FileCacheManager {
  private readonly diskCacheDir: string;
  private readonly maxDiskUsageBytes: number;

  constructor(options: CacheOptions) {
    // 初始化磁盘缓存目录和最大使用量
    this.diskCacheDir = options.diskCacheDir;
    this.maxDiskUsageBytes = options.maxDiskUsageBytes ?? Infinity;
    fs.ensureDirSync(this.diskCacheDir); // 确保缓存目录存在
  }

  /**
   * 获取当前磁盘缓存使用量（字节）
   */
  async getDiskUsage(): Promise<number> {
    let total = 0;
    const files = await fs.readdir(this.diskCacheDir);
    for (const file of files) {
      const filePath = path.join(this.diskCacheDir, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        total += stat.size;
      }
    }
    return total;
  }

  // 从缓存中获取音频文件
  async getCachedFile(trackKey: string): Promise<Buffer | null> {
    const diskCachePath: string = this.getDiskCachePath(trackKey);

    // 如果缓存文件存在，返回缓存的文件
    if (await fs.pathExists(diskCachePath)) {
      return await fs.readFile(diskCachePath);
    }

    return null;
  }

  // 缓存音频文件到磁盘
  async cacheFile(trackKey: string, fileBuffer: Buffer): Promise<void> {
    const diskCachePath = this.getDiskCachePath(trackKey);
    const fileSize = fileBuffer.length;

    // 检查是否超过最大磁盘使用量
    const currentUsage = await this.getDiskUsage();
    if (currentUsage + fileSize > this.maxDiskUsageBytes) {
      throw new Error(
        `超出最大缓存限制：当前已使用 ${currentUsage} 字节，尝试添加 ${fileSize} 字节，但最大允许 ${this.maxDiskUsageBytes} 字节。`
      );
    }

    // 写入文件到磁盘缓存
    await fs.writeFile(diskCachePath, fileBuffer);
  }

  // 获取磁盘缓存路径，缓存文件名通过 `platform-platform_unique_id` 来命名
  private getDiskCachePath(trackKey: string): string {
    const sanitizedKey = trackKey.replace(/[^a-zA-Z0-9]/g, '_'); // 确保缓存文件名合法
    return path.join(this.diskCacheDir, `${sanitizedKey}.mp3`); // 假设缓存的是MP3文件
  }

  // 生成缓存键：平台 + 唯一 ID
  generateCacheKey(platform: string, platformUniqueId: string): string {
    return `${platform}-${platformUniqueId}`;
  }

  // 清理磁盘缓存
  async clearDiskCache(): Promise<void> {
    const files = await fs.readdir(this.diskCacheDir);
    for (const file of files) {
      const filePath = path.join(this.diskCacheDir, file);
      await fs.remove(filePath); // 删除文件
    }
  }
}
