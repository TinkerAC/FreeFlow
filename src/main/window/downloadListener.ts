import { BrowserWindow } from 'electron';
import path from 'path';
import chalk from 'chalk';

export interface DownloadListenerOptions {
  getMainWindow: () => BrowserWindow | null;
  musicDir: string;
}

export function attachDownloadListener(
  worker: BrowserWindow,
  { getMainWindow, musicDir }: DownloadListenerOptions,
) {
  const ses = worker.webContents.session;
  if (ses.listenerCount('will-download') > 0) return;

  ses.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const total = item.getTotalBytes();
    const savePath = path.join(musicDir, fileName);

    console.log(chalk.blue(`[下载开始] ${fileName}`));
    console.log(`  大小: ${total} bytes`);
    console.log(`  保存到: ${savePath}`);

    // 不要 preventDefault，也不要 resume()
    item.setSavePath(savePath);

    const mainWin = getMainWindow();
    mainWin?.webContents.send('download-start', { fileName, savePath, total });

    let lastReceived = 0;
    const startTime = Date.now();

    item.on('updated', (_e, state) => {
      const received = item.getReceivedBytes();
      if (state === 'interrupted') {
        console.warn(chalk.yellow(`[下载中断] ${fileName}`));
        mainWin?.webContents.send('download-interrupted', { fileName });
      } else {
        const percent = total > 0 ? ((received / total) * 100).toFixed(2) : '0';
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? (received / elapsed).toFixed(0) : '0';
        const delta = received - lastReceived;
        lastReceived = received;

        console.log(
          chalk.green(`[下载进度] ${fileName}: ${percent}%  ${received}/${total} bytes  速度 ${speed} B/s  增量 ${delta} bytes`),
        );
        mainWin?.webContents.send('download-progress', {
          fileName,
          received,
          total,
          percent: Number(percent),
          speed: Number(speed),
        });
      }
    });

    item.once('done', (_e, state) => {
      if (state === 'completed') {
        console.log(chalk.green(`[下载完成] ${fileName}`));
      } else {
        console.error(chalk.red(`[下载失败] ${fileName}  状态: ${state}`));
      }
      mainWin?.webContents.send(
        state === 'completed' ? 'download-done' : 'download-failed',
        { fileName, savePath, state },
      );
    });
  });
}