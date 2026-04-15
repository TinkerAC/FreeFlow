import { ipcMain } from 'electron';
import * as os from 'node:os';
import * as path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import chalk from 'chalk';
import { Channels } from '@src/shared/ipc/channels';
import { TrackEntity } from '@src/shared/domainModel/TrackEntity';
import { WindowKey } from '@main/window/windowManager';
import { IpcContext } from './ipcContext';

export function registerDownloadHandlers({
                                           fileCacheManager,
                                           downloader,
                                           windowManager,
                                           dataPath,
                                           trackService,
                                         }: IpcContext): void {
  ipcMain.handle(Channels.System.CalcFileCacheDiskUsage, async () => {
    return await fileCacheManager.getDiskUsage();
  });

  ipcMain.on(Channels.Library.DownloadFromHifini, async (_evt, track: TrackEntity) => {
    const [rawLink] = await downloader.getLanzouDirectLink(track.platform_unique_id);
    if (!rawLink) return;

    const token = crypto.randomUUID();
    downloader.registerDownload(token, track.id);

    const worker = windowManager.ensure(WindowKey.WORKER);
    const ses = worker.webContents.session;
    ses.once('will-download', (event, item) => {
      const fileName = item.getFilename();
      const total = item.getTotalBytes();
      const savePath = path.join(os.tmpdir(), fileName);

      item.setSavePath(savePath);
      downloader.fillMeta(token, fileName, total, savePath);

      item.on('updated', (_e, state) => {
        if (state === 'progressing') {
          const received = item.getReceivedBytes();
          void received; // place-holder log if needed
        }
      });

      item.once('done', async (_e, state) => {
        if (state !== 'completed') {
          console.error(chalk.red(`[下载失败] ${fileName}`));
          downloader.delete(token);
          return;
        }

        console.log(chalk.green(`[下载完成] ${fileName}`));

        let finalFlac = '';
        try {
          if (fileName.toLowerCase().endsWith('.zip')) {
            finalFlac = await downloader.extractFlacFile(savePath, dataPath.musicDir);
          } else if (fileName.toLowerCase().endsWith('.flac')) {
            finalFlac = fileName;
            const dest = path.join(dataPath.musicDir, finalFlac);
            fs.copyFileSync(savePath, dest);
            console.log(chalk.green(`[FLAC 拷贝完成] → ${dest}`));
          } else {
            console.warn('未知格式，忽略');
          }

          await trackService.bindLocalTrackFile(track.id, finalFlac);
          console.log(chalk.green(`[数据库绑定完成] ${track.id} → ${finalFlac}`));
        } catch (err) {
          console.error(chalk.red('后处理失败:'), err);
        } finally {
          downloader.delete(token);
          fs.unlink(savePath, () => void 0);
        }
      });
    });

    ses.downloadURL(rawLink);
  });
}

