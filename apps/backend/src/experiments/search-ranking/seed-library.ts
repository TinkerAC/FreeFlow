import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 实验依赖桌面端缓存出来的 SQLite 曲库作为“现实世界种子”。
 * 这里统一管理路径探测与查询执行，避免实验入口夹杂底层 IO 细节。
 */
export class SeedLibrary {
  constructor(private readonly repoRoot: string) {}

  resolveDatabasePath() {
    const candidates = [
      resolve(this.repoRoot, 'temp/database.sqlite'),
      resolve(this.repoRoot, 'Temp/database.sqlite'),
    ];

    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found) {
      throw new Error('缺少实验种子库，请确认 temp/database.sqlite 或 Temp/database.sqlite 存在。');
    }
    return found;
  }

  /**
   * 统一使用 sqlite3 的 JSON 输出，避免手写列解析逻辑。
   * 调用方只需要提供 SQL，并为返回结果声明期望的结构即可。
   */
  runJsonQuery<T>(sql: string): T[] {
    const output = execFileSync('sqlite3', ['-json', this.resolveDatabasePath(), sql], {
      cwd: this.repoRoot,
      encoding: 'utf8',
    });
    return JSON.parse(output || '[]') as T[];
  }
}

/**
 * SQLite 里时间格式不稳定，可能既有空格分隔，也可能缺失时区。
 * 这里统一归一化成 Date，保证“新鲜度”计算可重复。
 */
export function parseSqliteDate(value: string | null | undefined, fallbackNow: Date) {
  const text = String(value ?? '').trim();
  if (!text) return new Date(fallbackNow);

  let normalized = text.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}(?:\.\d+)?)/, '$1T$2');
  normalized = normalized.replace(/\s+([+-]\d{2}:\d{2})$/, '$1');
  if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += 'Z';
  }
  return new Date(normalized);
}
