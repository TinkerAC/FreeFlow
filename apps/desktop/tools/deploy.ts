#!/usr/bin/env ts-node

/**
 * FreeFlow 自动部署脚本（跨平台 TypeScript 版）
 *
 * 1. 在 out/make/zip/<platform>/<arch>/ 目录下查找形如
 *    FreeFlow-<platform>-<arch>-x.y.z.zip 的最新文件
 * 2. 解压到临时目录
 * 3. macOS: 将 FreeFlow.app 移动到目标安装目录
 *    Windows: 将解压出的所有文件复制到目标安装目录；
 *       若目标目录已存在且非空，则提示用户 y(覆盖)/s(跳过)
 * 4. 清理临时目录
 */

import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { execSync, spawnSync } from 'child_process';
import os from 'os';
import readline from 'readline';

/**
 * 👉 预留安装目录：按需修改
 *   - macOS 默认安装到 /Applications
 *   - Windows 默认安装到 %ProgramFiles%\\FreeFlow
 */

function getAppInstallDir(): string {
  switch (process.platform) {
    case 'darwin':
      return '/Applications';
    case 'win32':
      return 'D:\\FreeFlow'; // 可根据需要修改
    default:
      throw new Error('不支持的操作系统：' + process.platform);
  }
}

export const APP_INSTALL_DIR: string = getAppInstallDir();

/**
 * 简易 semver 比较：a > b → 1，a < b → -1，= → 0
 */
function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * 递归计算目录大小（字节）
 */
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

/**
 * 交互式提问，返回小写字符串
 */
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
  const platform = process.platform === 'darwin' ? 'darwin' : 'win32';
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  const zipDir = join("..",'out', 'make', 'zip', platform, arch);

  if (!existsSync(zipDir)) {
    console.error(`❌ 构建目录不存在：${zipDir}`);
    process.exit(1);
  }

  const entries = await fs.readdir(zipDir);
  const pattern =
    platform === 'darwin'
      ? /^FreeFlow-darwin-arm64-(\d+\.\d+\.\d+)\.zip$/
      : /^FreeFlow-win32-x64-(\d+\.\d+\.\d+)\.zip$/;

  const candidates = entries
    .map((file) => {
      const m = file.match(pattern);
      return m ? { file, version: m[1] } : null;
    })
    .filter(Boolean) as { file: string; version: string }[];

  if (!candidates.length) {
    console.log('🔍 未发现任何构建产物，退出。');
    return;
  }

  candidates.sort((a, b) => compareVersion(a.version, b.version));
  const latest = candidates.at(-1)!;
  const zipPath = join(zipDir, latest.file);

  const createdTime = new Date((await fs.stat(zipPath)).birthtime).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
  });
  console.log(`✅ 找到最新构建：${latest.file} (v${latest.version})，构建时间：${createdTime}`);

  // ★ 解压到临时目录
  const tmpDir = join(zipDir, 'tmp_extract');
  if (existsSync(tmpDir)) await fs.rm(tmpDir, { recursive: true, force: true });
  await fs.mkdir(tmpDir, { recursive: true });

  console.log('🗜️  正在解压…');
  if (process.platform === 'win32') {
    // Windows：使用 PowerShell Expand-Archive
    const ps = spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path x\"${zipPath}\" -DestinationPath \"${tmpDir}\" -Force`,
      ],
      { stdio: 'inherit' },
    );
    if (ps.status !== 0) {
      console.error('❌ 解压失败（PowerShell Expand-Archive）');
      process.exit(ps.status ?? 1);
    }
  } else {
    // macOS/Linux：使用 unzip
    execSync(`unzip -q "${zipPath}" -d "${tmpDir}"`);
  }

  const appName = process.platform === 'darwin' ? 'FreeFlow.app' : 'FreeFlow.exe';
  const extractedApp = process.platform === 'darwin' ? join(tmpDir, appName) : tmpDir;

  if (!existsSync(extractedApp)) {
    console.error(`❌ 解压后的目录中未找到 ${appName}`);
    process.exit(1);
  }

  const extractedSize = ((await getDirSize(extractedApp)) / (1024 * 1024)).toFixed(2);
  console.log(`📦 解压后的应用大小：${extractedSize} MB`);

  // macOS 处理逻辑：移动整个 .app 包
  if (process.platform === 'darwin') {
    const destApp = join(APP_INSTALL_DIR, appName);

    // 如果目标已存在，先删除旧版本
    if (existsSync(destApp)) {
      console.log(`🗑️  删除旧版本：${destApp}`);
      await fs.rm(destApp, { recursive: true, force: true });
    }

    // 确保目标安装目录存在
    await fs.mkdir(APP_INSTALL_DIR, { recursive: true });

    console.log(`🚚 正在移动到 ${APP_INSTALL_DIR} …`);
    await fs.rename(extractedApp, destApp);
  } else {
    // Windows 处理逻辑：复制内容到安装目录
    // 检查目标目录是否非空
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

    // 重新创建目标目录
    await fs.mkdir(APP_INSTALL_DIR, { recursive: true });

    console.log(`🚚 正在复制文件到 ${APP_INSTALL_DIR} …`);
    const items = await fs.readdir(extractedApp, { withFileTypes: true });
    for (const item of items) {
      const srcPath = join(extractedApp, item.name);
      const destPath = join(APP_INSTALL_DIR, item.name);
      await fs.cp(srcPath, destPath, { recursive: true, force: true });
    }
  }

  // 清理临时目录
  await fs.rm(tmpDir, { recursive: true, force: true });
  console.log('🎉 部署完成！');
}

main().catch((err) => {
  console.error('发生错误：', err);
  process.exit(1);
});
