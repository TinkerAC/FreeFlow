// file: src/renderer/navigation/MainContentViewStack.ts

export enum View {
  PLAY_LIST = 'playlist',
  SEARCH_RESULTS = 'searchResults',
  PROFILE = 'profile',
  LYRIC = 'lyric',
  COMMENT = 'comment',
  DEBUG = 'debug',
  SETTINGS = 'settings',
  TRACK_DETAIL = 'trackDetail',
}

export interface StackItem {
  view: View;
  data?: any; // 用于传递额外数据，如 TrackEntity
}

export type ViewChangeListener = (stack: StackItem[], pointer: number) => void;

/**
 * 全局视图栈管理器：维护 stack 和 pointer，
 * 并支持 subscribe/notify，前进、后退、导航新视图。
 */
export class MainContentViewStack {
  private stack: StackItem[];
  private pointer: number;
  private listeners: ViewChangeListener[] = [];

  constructor(initial: StackItem) {
    this.stack = [initial];
    this.pointer = 0;
  }

  public get currentView(): View {
    return this.stack[this.pointer].view;
  }

  /** 获取当前整个栈 */
  public getStack(): StackItem[] {
    return this.stack;
  }

  /** 获取当前指针 */
  public getPointer(): number {
    return this.pointer;
  }

  /** 订阅栈变化，返回一个取消订阅函数 */
  public subscribe(fn: ViewChangeListener): () => void {
    this.listeners.push(fn);
    // 立即通知一次，让订阅者拿到初始值
    fn(this.stack, this.pointer);
    return () => {
      this.listeners = this.listeners.filter(f => f !== fn);
    };
  }

  /** 导航到新视图，会截断 pointer 之后的历史 */
  public navigate(view: View, data?: any) {

    //如果新视图已经在栈中，直接跳转到该视图
    const existingIndex = this.stack.findIndex(item => item.view === view);
    if (existingIndex !== -1) {
      // 如果提供了新数据，更新该项的数据
      if (data !== undefined) {
        this.stack[existingIndex].data = data;
      }
      this.pointer = existingIndex;
      this.notify();
      return;
    }
    //如果新视图不在栈中，则添加到栈中
    this.stack = this.stack.slice(0, this.pointer + 1);
    this.stack.push({ view, data });
    this.pointer = this.stack.length - 1;
    this.notify();

    console.info('已经导航到新视图:', view, data ? 'with data' : '');
  }

  /** 后退一步（如果可能） */
  public goBack() {
    if (this.pointer > 0) {
      this.pointer--;
      this.notify();
    }
  }

  /** 前进一步（如果可能） */
  public goForward() {
    if (this.pointer < this.stack.length - 1) {
      this.pointer++;
      this.notify();
    }
  }

  /** 通知所有监听器 */
  private notify() {
    this.listeners.forEach(fn => fn(this.stack, this.pointer));
  }
}
