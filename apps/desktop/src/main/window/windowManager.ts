// file: src/main/window/windowManager.ts
import { BrowserWindow, screen, WebContents } from 'electron';
import AppWindow from '@main/window/AppWindow';
import WorkerWindow from '@main/window/WorkerWindow';
import MiniPlayerWindow from '@main/window/MiniPlayerWindow';
import MusicWorkshopWindow from '@main/window/MusicWorkshopWindow';
import ProfileGuideWindow from '@main/window/ProfileGuideWindow';

export enum WindowKey {
  MAIN = 'MAIN',   // 主 UI 窗口
  WORKER = 'WORKER', // 后台下载 / 解析窗口
  MINI = 'MINI',     // 迷你播放器窗口
  CREATORS_WORKSHOP = 'CREATORS_WORKSHOP', // 创作者工作台窗口
  PROFILE_GUIDE = 'PROFILE_GUIDE', // Profile 引导窗口
}

type Factory = () => BrowserWindow;
export type WindowControlAction = 'minimize' | 'maximize' | 'close';

export interface MiniPlayerBoundsStore {
  get(key: string): unknown;
  setByPath(path: string, value: unknown): void;
}

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
  private miniBoundSet = new WeakSet<BrowserWindow>();
  private profileGuideClosedHandler: (() => void) | null = null;

  constructor() {
    // 注册各窗口工厂
    this.register(WindowKey.MAIN, () => new AppWindow(), 'primary');
    this.register(WindowKey.WORKER, () => new WorkerWindow(), 'bg');
    this.register(WindowKey.MINI, () => new MiniPlayerWindow(), 'primary');
    this.register(WindowKey.CREATORS_WORKSHOP, () => new MusicWorkshopWindow(), 'tool');
    this.register(WindowKey.PROFILE_GUIDE, () => new ProfileGuideWindow(), 'primary');
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

  /** 关闭窗口 */
  public close(key: WindowKey): void {
    this.get(key)?.close();
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

  /** 根据当前状态激活主要窗口（优先 MINI，其次 MAIN，最后 PROFILE_GUIDE） */
  public activatePrimaryWindow(): void {
    if (this.isVisible(WindowKey.MINI)) {
      this.activate(WindowKey.MINI);
      return;
    }

    if (this.get(WindowKey.MAIN)) {
      this.activate(WindowKey.MAIN);
      return;
    }

    this.activate(WindowKey.PROFILE_GUIDE);
  }

  /** 进入 Profile Guide 模式 */
  public enterProfileGuideMode(): BrowserWindow {
    this.hide(WindowKey.CREATORS_WORKSHOP);
    return this.showExclusive(WindowKey.PROFILE_GUIDE, true);
  }

  public showProfileGuide(): BrowserWindow {
    return this.showExclusive(WindowKey.PROFILE_GUIDE, true);
  }

  public closeProfileGuide(): void {
    this.close(WindowKey.PROFILE_GUIDE);
  }

  public onProfileGuideClosed(handler: (() => void) | null): void {
    this.profileGuideClosedHandler = handler;
  }

  /** MiniPlayer：显示并应用位置/尺寸持久化 */
  public showMiniPlayer(configStore: MiniPlayerBoundsStore): BrowserWindow {
    const mini = this.ensure(WindowKey.MINI);
    this.applyMiniPlayerBounds(mini, configStore);
    this.attachMiniPlayerPersistence(mini, configStore);
    this.showExclusive(WindowKey.MINI, true);
    return mini;
  }

  /** MiniPlayer：切换显示，返回被显示的窗口（若执行的是隐藏则返回 null） */
  public toggleMiniPlayer(configStore: MiniPlayerBoundsStore): BrowserWindow | null {
    if (this.isVisible(WindowKey.MINI)) {
      this.activate(WindowKey.MAIN);
      return null;
    }
    return this.showMiniPlayer(configStore);
  }

  /** MiniPlayer：隐藏并回到 MAIN */
  public hideMiniPlayer(): void {
    this.hide(WindowKey.MINI);
    this.activate(WindowKey.MAIN);
  }

  public setMiniPlayerExpanded(expanded: boolean): void {
    const mini = this.ensure(WindowKey.MINI);
    const [w] = mini.getSize();
    const collapsedH = 100;
    const expandedH = collapsedH + 120;
    mini.setSize(w, expanded ? expandedH : collapsedH, true);
  }

  /** 将 IPC sender 映射到窗口并执行窗口控制动作 */
  public controlFromWebContents(sender: WebContents, action: WindowControlAction): boolean {
    const win = BrowserWindow.fromWebContents(sender);
    if (!win || win.isDestroyed()) return false;
    return this.controlWindow(win, action);
  }

  public controlWindow(win: BrowserWindow, action: WindowControlAction): boolean {
    if (win.isDestroyed()) return false;

    switch (action) {
      case 'minimize':
        win.minimize();
        return true;
      case 'maximize':
        win.isMaximized() ? win.unmaximize() : win.maximize();
        return true;
      case 'close':
        win.close();
        return true;
      default:
        return false;
    }
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
    win.on('closed', () => {
      this.windows.delete(key);
      if (key === WindowKey.PROFILE_GUIDE) {
        this.profileGuideClosedHandler?.();
      }
    });
  }

  private applyMiniPlayerBounds(mini: BrowserWindow, configStore: MiniPlayerBoundsStore): void {
    try {
      const saved = configStore.get('ui.miniPlayer');
      if (!saved || typeof saved !== 'object') return;

      const { x, y, width, height } = saved as { x?: number; y?: number; width?: number; height?: number };
      const current = mini.getBounds();
      const [minW, minH] = mini.getMinimumSize();

      const next: Electron.Rectangle = {
        x: typeof x === 'number' ? x : current.x,
        y: typeof y === 'number' ? y : current.y,
        width: typeof width === 'number' ? Math.max(minW, width) : current.width,
        height: typeof height === 'number' ? Math.max(minH, height) : current.height,
      };

      const display = screen.getDisplayMatching(next);
      const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
      next.x = Math.max(dx, Math.min(next.x, dx + dw - 50));
      next.y = Math.max(dy, Math.min(next.y, dy + dh - 50));
      next.width = Math.min(next.width, dw);
      next.height = Math.min(next.height, dh);

      mini.setBounds(next, false);
    } catch (error) {
      console.warn('应用 MiniPlayer 窗口位置/大小失败:', error);
    }
  }

  private attachMiniPlayerPersistence(mini: BrowserWindow, configStore: MiniPlayerBoundsStore): void {
    if (this.miniBoundSet.has(mini)) return;
    this.miniBoundSet.add(mini);

    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        try {
          const bounds = mini.getBounds();
          configStore.setByPath('ui.miniPlayer', {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
          });
        } catch (error) {
          console.warn('保存 MiniPlayer 窗口位置/大小失败:', error);
        }
      }, 150);
    };

    mini.on('move', save);
    mini.on('resize', save);
    mini.on('close', save);
    mini.on('closed', () => {
      if (saveTimer) clearTimeout(saveTimer);
    });
  }
}

export const windowManager = new WindowManager();
