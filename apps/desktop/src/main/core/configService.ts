// file: src/main/services/ConfigService.ts
import { inject, injectable } from 'inversify';
import { BrowserWindow } from 'electron';
import Store from 'electron-store';
import { EventEmitter } from 'node:events';
import { DISymbol } from '@main/di/symbol';

import { defaultSettings, Settings } from '@src/shared/settings/schema';
import { Channels } from '@src/shared/ipc/channels';
import { AbstractService } from '@main/services/AbstractService';
import { Logger } from 'winston';

// ------- 小工具：按点路径读取/写入 -------
function getByPath(obj: any, path: string) {
  return path.split('.').reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
}

function setByPath(obj: any, path: string, value: any) {
  const segs = path.split('.');
  const last = segs.pop()!;
  const target = segs.reduce((o, k) => (o[k] ??= {}), obj);
  target[last] = value;
}

@injectable()
export class ConfigService extends AbstractService {
  private readonly ee = new EventEmitter();

  constructor(
    @inject(DISymbol.SettingsStore) private readonly store: Store<Settings>,
    @inject(DISymbol.Logger) protected readonly logger: Logger,
  ) {
    super();
    // 1) 启动即校验已有数据；不合法 => 直接重置为默认
    let raw: unknown = this.store.store;
    try {
      const parsed = Settings.parse(raw ?? {});
      // 合并默认值，避免漏掉新增字段
      const merged = { ...defaultSettings, ...parsed } as Settings;
      this.store.store = merged;
    } catch {
      // 旧数据或脏数据统统丢弃
      this.store.store = defaultSettings;
    }
  }

  /** 主进程内部订阅（可选） */
  onChanged(cb: (s: Settings) => void) {
    this.ee.on('changed', cb);
    return () => this.ee.off('changed', cb);
  }

  // ------------------- 读 -------------------
  getAll(): Settings {
    return this.store.store;
  }

  /** 支持 'a.b.c' 点路径 */
  get(key: string): any {
    if (key.includes('.')) return getByPath(this.store.store, key);
    // 直取顶层键（类型由调用方断言/转换）
    return (this.store.get as any)(key);
  }

  // ------------------- 写 -------------------
  /** 顶层键 或 点路径都可 */
  set(key: string, value: any): void {
    if (key.includes('.')) {
      const next = structuredClone(this.store.store);
      setByPath(next, key, value);
      this.commit(next);
    } else {
      const next = { ...this.store.store, [key]: value };
      this.commit(next);
    }
  }

  setByPath(path: string, value: any): void {
    const next = structuredClone(this.store.store);
    setByPath(next, path, value);
    this.commit(next);
  }

  /** 局部合并（浅合并），常用于一次性写入多项 */
  patch(partial: Partial<Settings>): void {
    const next = { ...this.store.store, ...partial };
    this.commit(next);
  }

  // ------------------- 内部：提交+广播 -------------------
  private commit(nextRaw: unknown) {
    // 合并默认值再校验，保证新增字段都有默认
    const merged = { ...defaultSettings, ...(nextRaw as object) };
    const parsed = Settings.parse(merged); // 校验失败会抛异常
    this.store.store = parsed;
    // 广播给渲染进程 + 主进程内部订阅者
    this.broadcast();
  }

  private broadcast() {
    const payload = this.store.store;
    BrowserWindow.getAllWindows().forEach((bw) => {
      bw.webContents.send(Channels.Config.Changed, payload);
    });
    this.ee.emit('changed', payload);
  }
}
