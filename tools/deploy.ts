#!/usr/bin/env ts-node

import { existsSync, promises as fs } from 'fs';
import { join, resolve } from 'path';
import os from 'os';
import readline from 'readline';

function getAppInstallDir(): string {
  switch (process.platform) {
    case 'darwin':
      return '/Applications';
    case 'win32':
      return 'D:\\FreeFlow';
    default:
      throw new Error(`不支持的操作系统：${process.platform}`);
  }
}

const APP_NAME = 'FreeFlow';
const APP_INSTALL_DIR = getAppInstallDir();
const PROJECT_ROOT = resolve(__dirname, '..');

function getPackagedOutputDir(): string {
  const platform = process.platform === 'darwin' ? 'darwin' : process.platform;
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  return join(PROJECT_ROOT, 'out', `${APP_NAME}-${platform}-${arch}`);
}

function getLocalAppEntry(outputDir: string): string {
  switch (process.platform) {
    case 'darwin':
      return join(outputDir, `${APP_NAME}.app`);
    case 'win32':
      return outputDir;
    default:
      throw new Error(`本机部署暂不支持该平台：${process.platform}`);
  }
}

async function getDirSize(dir: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await getDirSize(full);
    } else {
      const stat = await fs.stat(full);
      total += stat.size;
    }
  }
  return total;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main(): Promise<void> {
  const packagedDir = getPackagedOutputDir();
  const appSource = getLocalAppEntry(packagedDir);

  if (!existsSync(packagedDir) || !existsSync(appSource)) {
    console.error(`❌ 未找到可部署的构建目录：${appSource}`);
    console.error('请先执行 `pnpm run build:dir`。');
    process.exit(1);
  }

  const sourceSize = ((await getDirSize(appSource)) / (1024 * 1024)).toFixed(2);
  console.log(`✅ 找到本机构建产物：${appSource}`);
  console.log(`📦 构建产物大小：${sourceSize} MB`);

  if (process.platform === 'darwin') {
    const targetApp = join(APP_INSTALL_DIR, `${APP_NAME}.app`);
    if (existsSync(targetApp)) {
      console.log(`🗑️  删除旧版本：${targetApp}`);
      await fs.rm(targetApp, { recursive: true, force: true });
    }

    await fs.mkdir(APP_INSTALL_DIR, { recursive: true });
    console.log(`🚚 正在部署到 ${targetApp} …`);
    await fs.cp(appSource, targetApp, { recursive: true, force: true });
    console.log('🎉 本机部署完成！');
    return;
  }

  let shouldClean = false;
  if (existsSync(APP_INSTALL_DIR)) {
    const destEntries = await fs.readdir(APP_INSTALL_DIR);
    if (destEntries.length > 0) {
      const ans = await prompt(`⚠️  目标目录 ${APP_INSTALL_DIR} 已存在且非空。是否清空并覆盖？ (y:覆盖 / s:跳过) `);
      if (ans === 'y') {
        shouldClean = true;
      } else {
        console.log('⏩ 用户选择跳过复制，部署终止。');
        return;
      }
    }
  }

  if (shouldClean) {
    console.log(`🗑️  清空目标目录 ${APP_INSTALL_DIR} …`);
    await fs.rm(APP_INSTALL_DIR, { recursive: true, force: true });
  }

  await fs.mkdir(APP_INSTALL_DIR, { recursive: true });
  console.log(`🚚 正在复制文件到 ${APP_INSTALL_DIR} …`);
  const items = await fs.readdir(appSource, { withFileTypes: true });
  for (const item of items) {
    const srcPath = join(appSource, item.name);
    const destPath = join(APP_INSTALL_DIR, item.name);
    await fs.cp(srcPath, destPath, { recursive: true, force: true });
  }

  console.log('🎉 本机部署完成！');
}

main().catch((err) => {
  console.error('发生错误：', err);
  process.exit(1);
});
