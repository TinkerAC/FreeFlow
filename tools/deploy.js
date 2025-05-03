#!/usr/bin/env node

const fs = require('fs').promises;
const { existsSync } = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * 简单的 semver 比较，返回 1 if a>b, -1 if a<b, 0 if equal
 */
function compareVersion(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function main() {
  const root = process.cwd();
  const zipDir = path.join(root, 'out', 'make', 'zip', 'darwin', 'arm64');

  // 1. 读取目录
  let entries;
  try {
    entries = await fs.readdir(zipDir);
  } catch (err) {
    console.error(`无法访问目录 ${zipDir}:`, err);
    process.exit(1);
  }

  // 2. 筛选匹配 FreeFlow-darwin-arm64-x.y.z.zip 的文件
  const candidates = entries
    .map(file => {
      const m = file.match(/^FreeFlow-darwin-arm64-(\d+\.\d+\.\d+)\.zip$/);
      return m ? { file, version: m[1] } : null;
    })
    .filter(x => x);

  if (candidates.length === 0) {
    console.log('🔍 未发现任何构建产物，退出。');
    return;
  }

  // 3. 按版本号排序并选出最新
  candidates.sort((a, b) => compareVersion(a.version, b.version));
  const latest = candidates[candidates.length - 1];
  const zipPath = path.join(zipDir, latest.file);
  console.log(`✅ 找到最新构建：${latest.file} (v${latest.version})`);

  // 4. 解压到临时目录
  const tmpDir = path.join(zipDir, 'tmp_extract');
  if (existsSync(tmpDir)) {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
  await fs.mkdir(tmpDir, { recursive: true });

  console.log('🗜️  正在解压…');
  execSync(`unzip -q "${zipPath}" -d "${tmpDir}"`);

  // 5. 移动 .app 到 /Applications，覆盖同名应用
  const appName = 'FreeFlow.app';
  const extractedApp = path.join(tmpDir, appName);
  const destApp = path.join('/Applications', appName);

  if (!existsSync(extractedApp)) {
    console.error(`❌ 解压后的目录中未找到 ${appName}`);
    process.exit(1);
  }

  if (existsSync(destApp)) {
    console.log(`🗑️  删除旧版本：${destApp}`);
    await fs.rm(destApp, { recursive: true, force: true });
  }

  console.log(`🚚 正在移动到 /Applications…`);
  await fs.rename(extractedApp, destApp);

  // 6. 清理临时目录
  await fs.rm(tmpDir, { recursive: true, force: true });

  console.log('🎉 部署完成！');
}

main().catch(err => {
  console.error('发生错误：', err);
  process.exit(1);
});
