// file: src/main/window/windowManager.ts
import { BrowserWindow } from 'electron';
import AppWindow from '@main/window/AppWindow';
import WorkerWindow from '@main/window/WorkerWindow';
import MiniPlayerWindow from '@main/window/MiniPlayerWindow';

export enum WindowKey {
  MAIN = 'MAIN',   // 主 UI 窗口
  WORKER = 'WORKER', // 后台下载 / 解析窗口
  MINI = 'MINI',     // 迷你播放器窗口
}

type Factory = () => BrowserWindow;

/**
 * WindowManager（重构版）
 * - 统一的窗口注册/创建/获取/显示/隐藏/激活
 * - 工厂注册避免重复分支，便于扩展
 * - 支持分组互斥（如 MAIN 与 MINI 同属 primary 组）
 */
export class WindowManager {
  private windows = new Map<WindowKey, BrowserWindow>();
  private factories = new Map<WindowKey, Factory>();
  private groups = new Map<WindowKey, string>();

  constructor() {
    // 注册各窗口工厂
    this.register(WindowKey.MAIN, () => new AppWindow(), 'primary');
    this.register(WindowKey.WORKER, () => new WorkerWindow(), 'bg');
    this.register(WindowKey.MINI, () => new MiniPlayerWindow(), 'primary');
  }

  /** 注册窗口工厂与分组 */
  public register(key: WindowKey, factory: Factory, group: string = 'default'): void {
    this.factories.set(key, factory);
    this.groups.set(key, group);
  }

  /** 获取窗口，不存在返回 null */
  public get(key: WindowKey): BrowserWindow | null {
    const win = this.windows.get(key) ?? null;
    return win && !win.isDestroyed() ? win : null;
  }

  /** 窗口是否可见 */
  public isVisible(key: WindowKey): boolean {
    const w = this.get(key);
    return !!w && w.isVisible();
  }

  /** 确保窗口存在（不存在则创建） */
  public ensure(key: WindowKey): BrowserWindow {
    const existing = this.get(key);
    if (existing) return existing;
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`No factory registered for window: ${key}`);
    const win = factory();
    this.attach(key, win);
    return win;
  }

  /** 显示窗口（不处理互斥） */
  public show(key: WindowKey, focus: boolean = true): BrowserWindow {
    const win = this.ensure(key);
    if (win.isMinimized()) win.restore();
    win.show();
    if (focus) win.focus();
    return win;
  }

  /** 隐藏窗口 */
  public hide(key: WindowKey): void {
    this.get(key)?.hide();
  }

  /** 在所在分组内互斥显示（显示 key，隐藏同组其他窗口） */
  public showExclusive(key: WindowKey, focus: boolean = true): BrowserWindow {
    const group = this.groups.get(key);
    if (group) {
      for (const [k, w] of this.windows) {
        if (k !== key && this.groups.get(k) === group && !w.isDestroyed()) w.hide();
      }
    }
    return this.show(key, focus);
  }

  /** 激活窗口（确保存在、互斥显示并聚焦） */
  public activate(key: WindowKey): void {
    this.showExclusive(key, true);
  }

  /** 切换显示（可选互斥） */
  public toggle(key: WindowKey, exclusive: boolean = false): void {
    if (this.isVisible(key)) {
      this.hide(key);
      return;
    }
    exclusive ? this.showExclusive(key) : this.show(key);
  }

  /** 关闭所有窗口 */
  public shutdown(): void {
    this.windows.forEach((win) => {
      try {
        win.removeAllListeners();
        win.close();
      } catch (e) {
        console.warn('关闭窗口失败,可能是因为窗口已经关闭', e);
      }
    });
    this.windows.clear();
  }

  /** 绑定窗口并管理生命周期 */
  private attach(key: WindowKey, win: BrowserWindow): void {
    this.windows.set(key, win);
    // 调试输出已移除
    win.on('closed', () => this.windows.delete(key));
  }
}
