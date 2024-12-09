// localLibraryService.ts

import fs from 'fs/promises';
import path from 'path';
import { inject, injectable } from 'inversify';
import { getConfig } from '@main/services/ConfigService';
import { fileExists } from '@src/utils/helpers';
import TrackRepository from '@main/repository/TrackRepository';
import { TrackModel } from '@src/shared/types';
import Store from 'electron-store';

@injectable()
class LocalLibraryService {
  constructor(
    @inject('TrackRepository') private trackRepository: TrackRepository,
    @inject('Store') private store: Store,
    // 注入其他需要的依赖
  ) {
  }

  public async updateLocalLibrary(): Promise<void> {
    const scanPaths = getConfig(this.store, 'scan_paths');
    if (!scanPaths || scanPaths.length === 0) {
      console.warn('没有配置扫描路径，将跳过更新音乐库');
      return;
    }

    const supportedFormats = getConfig(this.store, 'supported_formats').map((ext: string) => ext.toLowerCase());
    console.log('scanPaths:', scanPaths);
    console.log('supportedFormats:', supportedFormats);


    try {

      // 获取需要添加的曲目列表
      const tracks = await this.getTracksFromPaths(scanPaths, supportedFormats);

      // 如果找到新曲目，插入数据库
      if (tracks.length > 0) {
        for (const track of tracks) {
          await this.trackRepository.create(track);
        }
      } else {
        console.log('没有找到新的音频文件');
      }

      // 提交事务（如果适用）
      // await this.trackRepository.commitTransaction();

      console.log('音乐库更新完成');
    } catch (error) {
      // 回滚事务（如果适用）
      // await this.trackRepository.rollbackTransaction();

      console.error(`更新本地音乐库时出错: ${error.message}`);
      console.error(error);
    }
  }

  private async getTracksFromPaths(paths: string[], formats: string[]): Promise<TrackModel[]> {
    const tracks: TrackModel[] = [];

    for (const directoryPath of paths) {
      if (await fileExists(directoryPath)) {
        try {
          const files = await fs.readdir(directoryPath, { withFileTypes: true });
          for (const dirent of files) {
            if (dirent.isFile()) {
              const ext = path.extname(dirent.name).substring(1).toLowerCase();
              if (formats.includes(ext)) {
                const filePath = path.resolve(directoryPath, dirent.name);
                const normalizedPath = path.resolve(filePath);

                // 检查文件是否已存在于库中
                const existingTrack = await this.trackRepository.findByPlatformAndPlatformUniqueId('Local', normalizedPath);

                if (!existingTrack) {
                  console.log(`发现新文件: ${normalizedPath}`);
                  const trackData: any = {
                    platform: 'Local',
                    platform_unique_id: normalizedPath,
                    created_at: new Date(),
                    // 添加其他必要的字段
                  };
                  tracks.push(trackData);
                }
              }
            }
          }
        } catch (error) {
          console.error(`读取目录 ${directoryPath} 时出错: ${error.message}`);
        }
      } else {
        console.warn(`目录不存在: ${directoryPath}`);
      }
    }

    return tracks;
  }
}

export default LocalLibraryService;
